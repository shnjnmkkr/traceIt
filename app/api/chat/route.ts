import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { calculateAttendanceStats } from '@/lib/attendance-calculator';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { rateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limiter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 messages per minute per user
    const rateLimitResult = rateLimit(getIdentifier(user.id), RATE_LIMITS.AI_CHAT);
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Input validation: Limit message length to prevent abuse
    if (typeof message !== 'string' || message.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be a string with max 1000 characters' },
        { status: 400 }
      );
    }

    // 1. Fetch user's timetable
    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (ttError || !timetable) {
      return NextResponse.json({
        response: "You don't have a timetable set up yet. Please create one first!",
      });
    }

    // 2. Fetch slots
    const { data: slotsData, error: slotsError } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('timetable_id', timetable.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsError) throw slotsError;

    // Transform slots to frontend format
    const slots = (slotsData || []).map((slot: any) => ({
      id: slot.id,
      day: slot.day_of_week,
      startTime: slot.start_time.substring(0, 5),
      endTime: slot.end_time.substring(0, 5),
      subject: slot.subject_code,
      subjectName: slot.subject_name,
      room: slot.room,
      instructor: slot.instructor,
      type: slot.slot_type || 'lecture',
      rowSpan: slot.row_span,
    }));

    // 3. Fetch attendance records
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        timetable_slots!inner (
          timetable_id
        )
      `)
      .eq('user_id', user.id)
      .eq('timetable_slots.timetable_id', timetable.id);

    if (attError) throw attError;

    // Transform attendance to Map
    const attendanceMap = new Map<string, string>();
    (attendance || []).forEach((record: any) => {
      const key = `${record.date}-${record.slot_id}`;
      attendanceMap.set(key, record.status);
    });

    // 4. Fetch user settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const settings = settingsData ? {
      targetPercentage: parseFloat(settingsData.target_percentage),
      countMassBunkAs: settingsData.count_mass_bunk_as,
      countTeacherAbsentAs: settingsData.count_teacher_absent_as,
      showAnalytics: settingsData.show_analytics,
      includeLabsInOverall: settingsData.include_labs_in_overall !== false, // Default to true
    } : {
      targetPercentage: 75,
      countMassBunkAs: 'absent',
      countTeacherAbsentAs: 'attended',
      showAnalytics: true,
      includeLabsInOverall: true,
    };

    // 5. Calculate current attendance stats
    const semesterStart = new Date(timetable.start_date);
    const semesterEnd = new Date(timetable.end_date);
    const currentWeekStart = new Date();
    const today = new Date();
    
    const stats = calculateAttendanceStats(
      slots,
      attendanceMap,
      semesterStart,
      semesterEnd,
      settings,
      currentWeekStart
    );

    // 6. Format schedule for LLM (clearly distinguish labs and lectures)
    const schedule = slots.map(slot => ({
      day: DAYS[slot.day],
      time: `${slot.startTime} - ${slot.endTime}`,
      subject: slot.subjectName,
      code: slot.subject,
      type: slot.type || 'lecture', // "lab" or "lecture"
      classType: slot.type === 'lab' ? 'Lab Session' : 'Lecture',
      duration: slot.rowSpan ? `${slot.rowSpan} hour${slot.rowSpan > 1 ? 's' : ''}` : '1 hour',
      room: slot.room || 'Not specified',
      instructor: slot.instructor || 'Not specified',
      note: slot.type === 'lab' 
        ? 'Lab: counts as 1 session regardless of duration' 
        : `Lecture: counts as ${slot.rowSpan || 1} class${(slot.rowSpan || 1) > 1 ? 'es' : ''} (per hour)`,
    }));

    // 7. Create context for LLM (only essential data, no internal calculations)
    const context = {
      semester: {
        name: timetable.name,
        section: timetable.section,
        startDate: format(semesterStart, 'MMM dd, yyyy'),
        endDate: format(semesterEnd, 'MMM dd, yyyy'),
      },
      schedule,
      attendance: {
        overall: `${stats.overall}%`,
        subjects: stats.subjects.map(s => {
          const subjectData: any = {
            name: s.name,
            code: s.code,
            percentage: `${s.percentage}%`,
            attended: s.attended,
            total: s.total,
            bunked: s.bunked,
            leaves: s.leaves,
            teacherAbsent: s.teacherAbsent,
          };
          
          // Only include lab/lecture breakdown if they exist, without internal calculations
          if (s.lab) {
            subjectData.lab = {
              attended: s.lab.attended,
              total: s.lab.total,
              percentage: `${s.lab.percentage}%`,
            };
          }
          
          if (s.lecture) {
            subjectData.lecture = {
              attended: s.lecture.attended,
              total: s.lecture.total,
              percentage: `${s.lecture.percentage}%`,
            };
          }
          
          return subjectData;
        }),
      },
      settings: {
        targetPercentage: `${settings.targetPercentage}%`,
        massBunkCounting: settings.countMassBunkAs,
        teacherAbsentCounting: settings.countTeacherAbsentAs,
      },
    };

    // 8. Call Groq API with fallback models
    const models = ['llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    let completion;
    let lastError;

    for (const model of models) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `You are the AI assistant for traceIt - a timetable and attendance management app. Answer ONLY questions about schedules and attendance.

Current date: ${format(today, 'EEEE, MMMM dd, yyyy')}
Semester: ${format(semesterStart, 'MMM dd')} - ${format(semesterEnd, 'MMM dd, yyyy')}

Student data:
${JSON.stringify(context, null, 2)}

CRITICAL RULES:
1. Use ONLY the data provided above. DO NOT ask for more details - you have everything you need.
2. Be DIRECT and CONCISE. No lengthy explanations or mathematical derivations.
3. Answer questions immediately using the provided timetable and attendance data.
4. If asked something unrelated, say: "I only help with timetable and attendance in traceIt."
5. DO NOT expose internal calculation variables like semesterTotal, remaining, target, minimumNeeded, or canMiss in your responses.
6. Answer questions naturally without showing intermediate calculation steps or variable names.

RESPONSE FORMAT:
- No markdown (no **, ##, etc.)
- Use • for bullets
- Keep it short and scannable
- Provide answers directly without showing variable names or calculation formulas

LABS vs LECTURES:
- Same subject code can have both lab and lecture
- Lab = 1 session regardless of duration
- Lecture = counts per hour
- Show separate stats when both exist

Days: Mon-Fri only. Times: 24-hour format.`,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.5,
          max_tokens: 500,
        });
        break; // Success - exit loop
      } catch (err: any) {
        lastError = err;
        continue; // Try next model
      }
    }

    if (!completion) {
      throw lastError || new Error('All models failed');
    }

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
