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

    // 5a. Calculate total classes per subject for entire semester (needed for accurate calculations)
    const calculateTotalSemesterClasses = () => {
      const allSemesterDates = eachDayOfInterval({ start: semesterStart, end: semesterEnd });
      const subjectTotals = new Map<string, {
        total: number;
        labTotal: number;
        lectureTotal: number;
      }>();

      // Initialize all subjects
      slots.forEach(slot => {
        if (!subjectTotals.has(slot.subject)) {
          subjectTotals.set(slot.subject, { total: 0, labTotal: 0, lectureTotal: 0 });
        }
      });

      // Count classes for entire semester
      allSemesterDates.forEach(date => {
        const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1;
        if (dayOfWeek >= 5) return; // Skip weekends

        const daySlots = slots.filter(s => s.day === dayOfWeek);
        daySlots.forEach(slot => {
          const stats = subjectTotals.get(slot.subject);
          if (!stats) return;

          const slotType = slot.type || 'lecture';
          const weight = slotType === "lab" ? 1 : (slot.rowSpan || 1);
          stats.total += weight;
          
          if (slotType === "lab") {
            stats.labTotal += 1;
          } else {
            stats.lectureTotal += weight;
          }
        });
      });

      return subjectTotals;
    };

    const semesterTotals = calculateTotalSemesterClasses();

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

    // 7. Create context for LLM with semester totals for accurate calculations
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
          const semesterTotal = semesterTotals.get(s.code);
          const subjectData: any = {
            name: s.name,
            code: s.code,
            percentage: `${s.percentage}%`,
            attended: s.attended,
            total: s.total, // Classes occurred so far
            semesterTotal: semesterTotal?.total || 0, // Total classes in entire semester
            remaining: Math.max(0, (semesterTotal?.total || 0) - s.total), // Classes remaining in semester
            bunked: s.bunked,
            leaves: s.leaves,
            teacherAbsent: s.teacherAbsent,
          };
          
          // Include lab/lecture breakdown with semester totals
          if (s.lab) {
            subjectData.lab = {
              attended: s.lab.attended,
              total: s.lab.total, // Lab classes occurred so far
              semesterTotal: semesterTotal?.labTotal || 0, // Total lab classes in semester
              remaining: Math.max(0, (semesterTotal?.labTotal || 0) - s.lab.total), // Lab classes remaining
              percentage: `${s.lab.percentage}%`,
            };
          }
          
          if (s.lecture) {
            subjectData.lecture = {
              attended: s.lecture.attended,
              total: s.lecture.total, // Lecture classes occurred so far
              semesterTotal: semesterTotal?.lectureTotal || 0, // Total lecture classes in semester
              remaining: Math.max(0, (semesterTotal?.lectureTotal || 0) - s.lecture.total), // Lecture classes remaining
              percentage: `${s.lecture.percentage}%`,
            };
          }
          
          return subjectData;
        }),
      },
      settings: {
        targetPercentage: settings.targetPercentage, // Number, not string, for calculations
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
              content: `You are a friendly AI assistant for traceIt, helping students manage their timetable and attendance. Answer ONLY questions about schedules and attendance.

Current date: ${format(today, 'EEEE, MMMM dd, yyyy')}
Semester: ${format(semesterStart, 'MMM dd')} - ${format(semesterEnd, 'MMM dd, yyyy')}

Student data:
${JSON.stringify(context, null, 2)}

CRITICAL RULES:
1. ALWAYS provide CONTEXT and REFERENCE POINTS - never give numbers without explaining what they mean.
2. When saying "you can miss X classes", ALWAYS specify the time period (this semester, this week, remaining in semester).
3. Include current status when giving "can miss" answers (e.g., "You've attended 4 out of 7 classes so far, with 56 remaining this semester").
4. Be CONVERSATIONAL but INFORMATIVE - give complete, actionable information.
5. Use ONLY the data provided. Don't ask for more details.
6. If asked something unrelated, say: "I only help with timetable and attendance in traceIt."

CALCULATING "HOW MANY CLASSES CAN I MISS":
For each subject, use this calculation:
- semesterTotal = total classes in entire semester (from context)
- attended = classes attended so far (from context)
- remaining = classes remaining in semester (from context)
- target = targetPercentage% of semesterTotal (round up to nearest whole number)
- minimumNeeded = target - attended (must attend this many more to reach target)
- canMiss = remaining - minimumNeeded (can miss this many)

IMPORTANT: Labs count towards attendance targets too! Never say "you can miss as many labs as you want" - labs are part of the total attendance requirement.

For subjects with both lab and lecture, calculate separately:
- Use lecture.semesterTotal, lecture.attended, lecture.remaining for lecture calculations
- Use lab.semesterTotal, lab.attended, lab.remaining for lab calculations
- Both contribute to the overall subject attendance target

GOOD RESPONSE EXAMPLES:
• "For ASM: You've attended 4 out of 7 classes so far (57%), with 56 classes remaining this semester. To meet your 75% target, you need to attend at least 47 classes total. You can miss 13 more classes this semester."
• "For CS lectures: You've attended 2 lectures so far, with 42 remaining. You need 45 total to meet the target, so you can miss 1 more lecture this semester."

BAD RESPONSE EXAMPLES (DON'T DO THIS):
• "You can miss as many lab sessions as you want" (WRONG - labs count towards attendance)
• "For ASM, you can miss 3 more lectures and 0 more labs." (No context, wrong calculation)
• "You can miss 3 more lectures." (No subject, no time period, no reference point)

RESPONSE FORMAT:
- No markdown formatting
- Use • for bullets when listing multiple items
- ALWAYS include: subject name, current status (attended/total), time period (this semester/this week), and what the number means
- Keep responses concise but complete with all necessary context
- Sound like you're talking to a helpful friend who gives complete information

LABS vs LECTURES:
- Same subject can have both lab and lecture
- Lab = 1 session regardless of duration
- Lecture = counts per hour
- Mention both separately when relevant

Days: Mon-Fri only. Times: 24-hour format.`,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 400,
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
