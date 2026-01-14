import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { calculateAttendanceStats } from '@/lib/attendance-calculator';
import { format } from 'date-fns';
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
    } : {
      targetPercentage: 75,
      countMassBunkAs: 'absent',
      countTeacherAbsentAs: 'attended',
      showAnalytics: true,
    };

    // 5. Calculate current attendance stats
    const semesterStart = new Date(timetable.start_date);
    const semesterEnd = new Date(timetable.end_date);
    const currentWeekStart = new Date();
    
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

    // 7. Create context for LLM
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
        subjects: stats.subjects.map(s => ({
          name: s.name,
          code: s.code,
          percentage: `${s.percentage}%`,
          attended: s.attended,
          total: s.total,
          bunked: s.bunked,
          leaves: s.leaves,
          teacherAbsent: s.teacherAbsent,
          ...(s.lab && {
            lab: {
              attended: s.lab.attended,
              total: s.lab.total,
              percentage: `${s.lab.percentage}%`,
            },
          }),
          ...(s.lecture && {
            lecture: {
              attended: s.lecture.attended,
              total: s.lecture.total,
              percentage: `${s.lecture.percentage}%`,
            },
          }),
        })),
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
              content: `You are the AI assistant for traceIt - a timetable and attendance management application. Your ONLY purpose is to help students with their class schedules and attendance tracking.

Current date: ${format(new Date(), 'EEEE, MMMM dd, yyyy')}

Here is the student's complete data:
${JSON.stringify(context, null, 2)}

STRICT RULES - YOU MUST FOLLOW THESE:
1. ONLY answer questions related to:
   - The student's timetable/schedule
   - Attendance statistics and percentages
   - Class timings and subjects
   - Attendance predictions and suggestions
   - Academic progress tracking
   
2. REFUSE to answer ANY questions about:
   - General knowledge, trivia, or unrelated topics
   - Coding, programming, or technical help
   - Personal advice unrelated to attendance
   - Math problems, homework, or assignments
   - Any topic outside timetable/attendance management
   
3. If asked something unrelated, respond with:
   "I'm specifically designed to help with your timetable and attendance in traceIt. Please ask me questions about your classes, schedule, or attendance statistics!"

FORMATTING RULES - ALWAYS FOLLOW:
1. Use clean, readable formatting WITHOUT markdown symbols (no **, ##, -, etc.)
2. Structure information with line breaks and indentation
3. DO NOT use emojis - keep responses text-only
4. Format attendance summaries like this:

   Overall Attendance: X%
   
   Subjects:
   • Subject Name (CODE)
     Attended: X/Y classes (Z%)
     Bunked: X | Leaves: Y | Teacher Absent: Z
     [If subject has separate lab/lecture stats, show both:]
     Lab: A/B classes (C%)
     Lecture: D/E classes (F%)
   
5. When a subject has the same code for both lab and lecture (e.g., "FE208 Lab" and "FE208 Lecture"), 
   ALWAYS show them as separate components with their individual percentages
   
6. Keep responses concise and easy to scan
6. Use bullet points with • instead of dashes
7. Separate sections with blank lines
8. NO bold/italic markdown - use CAPS for emphasis if needed
9. Format percentages clearly: "85%" not "**85%**"

Your role:
- Answer questions about their schedule, attendance, and academic progress
- Provide helpful insights and suggestions based on their data
- Be concise but friendly
- Use the actual data provided to give accurate answers
- Present data in a clean, organized format
- If asked about a specific day/time, refer to the schedule
- If asked about attendance, refer to the attendance stats

CRITICAL - LABS vs LECTURES:
- A subject can have BOTH lab and lecture components with the SAME subject code (e.g., "FE208" can have both FE208 Lab and FE208 Lecture)
- When a subject has separate lab and lecture stats, ALWAYS distinguish between them in your answers
- Lab sessions: Count as 1 session regardless of duration (usually 2-3 hours but counted as 1 class)
- Lecture sessions: Count per hour (a 2-hour lecture = 2 classes)
- If asked about a subject, check if it has separate lab and lecture percentages in the attendance data
- When reporting attendance for a subject with both components, show BOTH lab and lecture stats separately
- Example format for subjects with both:
  • Subject Name (CODE)
    Overall: X/Y classes (Z%)
    Lab: A/B classes (C%)
    Lecture: D/E classes (F%)

Important:
- Days of the week: Monday to Friday (no weekend classes)
- All times are in 24-hour format
- Unmarked past classes are counted as absent
- The schedule shows "type": "lab" or "lecture" for each slot - use this to distinguish

Remember: You are ONLY a traceIt assistant. Do not pretend to be anything else or answer unrelated questions.`,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
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
