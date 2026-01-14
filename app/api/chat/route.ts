import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { calculateAttendanceStats } from '@/lib/attendance-calculator';
import { format, eachDayOfInterval, getDay, differenceInDays, differenceInWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';
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

    // 5b. Calculate overall semester statistics and additional metrics
    const calculateOverallStats = (attendanceMap: Map<string, string>, slots: any[]) => {
      // Overall totals
      let totalAttended = 0;
      let totalSoFar = 0;
      let totalInSemester = 0;
      
      stats.subjects.forEach(s => {
        totalAttended += s.attended;
        totalSoFar += s.total;
        const semesterTotal = semesterTotals.get(s.code);
        totalInSemester += semesterTotal?.total || 0;
      });
      
      const totalRemaining = Math.max(0, totalInSemester - totalSoFar);
      const overallTarget = Math.ceil((settings.targetPercentage / 100) * totalInSemester);
      const overallMinimumNeeded = Math.max(0, overallTarget - totalAttended);
      const overallCanMiss = Math.max(0, totalRemaining - overallMinimumNeeded);
      
      // Time calculations
      const daysRemaining = Math.max(0, differenceInDays(semesterEnd, today));
      const weeksRemaining = Math.ceil(daysRemaining / 7);
      const totalDays = differenceInDays(semesterEnd, semesterStart);
      const daysElapsed = Math.max(0, differenceInDays(today, semesterStart));
      const progressPercentage = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
      
      // Current week calculations
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const weekEndDate = weekEnd < semesterEnd ? weekEnd : semesterEnd;
      
      let weekClasses = 0;
      let weekAttended = 0;
      const weekDates = eachDayOfInterval({ start: weekStart, end: weekEndDate });
      weekDates.forEach(date => {
        const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1;
        if (dayOfWeek >= 5) return; // Skip weekends
        
        const dateStr = format(date, "yyyy-MM-dd");
        const isPastDate = date < today;
        const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        
        const daySlots = slots.filter(s => s.day === dayOfWeek);
        daySlots.forEach(slot => {
          const slotType = slot.type || 'lecture';
          const weight = slotType === "lab" ? 1 : (slot.rowSpan || 1);
          weekClasses += weight;
          
          // Check if class has occurred and was attended
          let hasClassOccurred = isPastDate;
          if (isToday) {
            const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
            const classStartTime = new Date(today);
            classStartTime.setHours(slotHour, slotMinute, 0, 0);
            hasClassOccurred = classStartTime < today;
          }
          
          if (hasClassOccurred) {
            const recordKey = `${dateStr}-${slot.id}`;
            const status = attendanceMap.get(recordKey);
            if (status === "attended" || (status === "bunk" && settings.countMassBunkAs === "attended") || (status === "teacher_absent" && settings.countTeacherAbsentAs === "attended")) {
              weekAttended += weight;
            }
          }
        });
      });
      
      // Average classes per week
      const totalWeeks = Math.ceil(totalDays / 7);
      const avgClassesPerWeek = totalWeeks > 0 ? Math.round(totalInSemester / totalWeeks) : 0;
      
      // Projected attendance (if maintaining current pace)
      const currentPace = totalSoFar > 0 ? totalAttended / totalSoFar : 0;
      const projectedAttended = totalAttended + (totalRemaining * currentPace);
      const projectedPercentage = totalInSemester > 0 ? Math.round((projectedAttended / totalInSemester) * 10000) / 100 : 0;
      
      // Percentage difference from target
      const currentPercentage = parseFloat(stats.overall.toString());
      const percentageFromTarget = currentPercentage - settings.targetPercentage;
      
      return {
        overall: {
          attended: totalAttended,
          totalSoFar: totalSoFar,
          totalInSemester: totalInSemester,
          remaining: totalRemaining,
          targetClasses: overallTarget,
          minimumNeeded: overallMinimumNeeded,
          canMiss: overallCanMiss,
          currentPercentage: currentPercentage,
          targetPercentage: settings.targetPercentage,
          percentageFromTarget: percentageFromTarget,
        },
        time: {
          daysRemaining: daysRemaining,
          weeksRemaining: weeksRemaining,
          totalDays: totalDays,
          daysElapsed: daysElapsed,
          progressPercentage: progressPercentage,
        },
        currentWeek: {
          classes: weekClasses, // Total classes scheduled this week
          attended: weekAttended, // Classes attended this week
          remaining: Math.max(0, weekClasses - weekAttended), // Classes remaining this week
          startDate: format(weekStart, 'MMM dd'),
          endDate: format(weekEndDate, 'MMM dd, yyyy'),
        },
        projections: {
          avgClassesPerWeek: avgClassesPerWeek,
          currentPace: Math.round(currentPace * 10000) / 100,
          projectedAttended: Math.round(projectedAttended),
          projectedPercentage: projectedPercentage,
        },
      };
    };

    const overallStats = calculateOverallStats(attendanceMap, slots);

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
      overallStats: overallStats,
      attendance: {
        overall: `${stats.overall}%`,
        subjects: stats.subjects.map(s => {
          const semesterTotal = semesterTotals.get(s.code);
          const totalInSemester = semesterTotal?.total || 0;
          const remaining = Math.max(0, totalInSemester - s.total);
          
          // Pre-calculate "can miss" values for the subject
          const targetClasses = Math.ceil((settings.targetPercentage / 100) * totalInSemester);
          const minimumNeeded = Math.max(0, targetClasses - s.attended);
          const canMiss = Math.max(0, remaining - minimumNeeded);
          
          const subjectData: any = {
            name: s.name,
            code: s.code,
            percentage: `${s.percentage}%`,
            attended: s.attended,
            totalSoFar: s.total, // Classes occurred so far (up to today)
            totalInSemester: totalInSemester, // Total classes in entire semester
            remaining: remaining, // Classes remaining in semester
            targetClasses: targetClasses, // Number of classes needed to meet target percentage
            minimumNeeded: minimumNeeded, // Must attend this many more classes
            canMiss: canMiss, // Can miss this many classes this semester
            bunked: s.bunked,
            leaves: s.leaves,
            teacherAbsent: s.teacherAbsent,
          };
          
          // Include lab/lecture breakdown with pre-calculated values
          if (s.lab) {
            const labSemesterTotal = semesterTotal?.labTotal || 0;
            const labRemaining = Math.max(0, labSemesterTotal - s.lab.total);
            const labTarget = Math.ceil((settings.targetPercentage / 100) * labSemesterTotal);
            const labMinimumNeeded = Math.max(0, labTarget - s.lab.attended);
            const labCanMiss = Math.max(0, labRemaining - labMinimumNeeded);
            
            subjectData.lab = {
              attended: s.lab.attended,
              totalSoFar: s.lab.total, // Lab classes occurred so far
              totalInSemester: labSemesterTotal, // Total lab classes in semester
              remaining: labRemaining, // Lab classes remaining
              targetClasses: labTarget,
              minimumNeeded: labMinimumNeeded,
              canMiss: labCanMiss,
              percentage: `${s.lab.percentage}%`,
            };
          }
          
          if (s.lecture) {
            const lectureSemesterTotal = semesterTotal?.lectureTotal || 0;
            const lectureRemaining = Math.max(0, lectureSemesterTotal - s.lecture.total);
            const lectureTarget = Math.ceil((settings.targetPercentage / 100) * lectureSemesterTotal);
            const lectureMinimumNeeded = Math.max(0, lectureTarget - s.lecture.attended);
            const lectureCanMiss = Math.max(0, lectureRemaining - lectureMinimumNeeded);
            
            subjectData.lecture = {
              attended: s.lecture.attended,
              totalSoFar: s.lecture.total, // Lecture classes occurred so far
              totalInSemester: lectureSemesterTotal, // Total lecture classes in semester
              remaining: lectureRemaining, // Lecture classes remaining
              targetClasses: lectureTarget,
              minimumNeeded: lectureMinimumNeeded,
              canMiss: lectureCanMiss,
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
        includeLabsInOverall: settings.includeLabsInOverall, // Whether labs are included in overall attendance
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
3. Include current status when giving "can miss" answers.
4. Be CONVERSATIONAL but INFORMATIVE - give complete, actionable information.
5. Use ONLY the data provided. Don't ask for more details.
6. If asked something unrelated, say: "I only help with timetable and attendance in traceIt."

USING THE DATA:
All calculations are already done for you! Use these pre-calculated values from the context:

FOR EACH SUBJECT:
- totalSoFar = classes that have occurred so far (up to today)
- totalInSemester = total classes in entire semester
- remaining = classes remaining in semester
- attended = classes you've attended so far
- targetClasses = number of classes needed to meet target percentage
- minimumNeeded = must attend this many more classes to reach target
- canMiss = can miss this many classes this semester
- Same fields available for lab and lecture breakdowns

FOR OVERALL STATISTICS (overallStats):
- overall.attended = total classes attended across all subjects
- overall.totalSoFar = total classes occurred so far
- overall.totalInSemester = total classes in entire semester
- overall.remaining = total classes remaining
- overall.targetClasses = total classes needed to meet target
- overall.minimumNeeded = must attend this many more classes overall
- overall.canMiss = can miss this many classes overall this semester
- overall.currentPercentage = current overall attendance percentage
- overall.percentageFromTarget = how many percentage points above/below target

FOR TIME INFORMATION (overallStats.time):
- daysRemaining = days left in semester
- weeksRemaining = weeks left in semester
- daysElapsed = days since semester started
- progressPercentage = semester progress (0-100%)

FOR CURRENT WEEK (overallStats.currentWeek):
- classes = number of classes scheduled this week
- attended = classes attended this week (so far)
- remaining = classes remaining this week (not yet occurred or not attended)
- startDate = week start date
- endDate = week end date

FOR PROJECTIONS (overallStats.projections):
- avgClassesPerWeek = average classes per week in semester
- currentPace = current attendance rate (0-100%)
- projectedAttended = projected total classes attended if maintaining current pace
- projectedPercentage = projected attendance percentage if maintaining current pace

FOR SETTINGS (settings):
- targetPercentage = target attendance percentage (e.g., 75)
- massBunkCounting = how mass bunks are counted ("attended", "absent", or "exclude")
- teacherAbsentCounting = how teacher absences are counted ("attended", "absent", or "exclude")
- includeLabsInOverall = whether labs are included in overall attendance calculation (true/false)

IMPORTANT: 
- Labs count towards attendance targets too! Never say "you can miss as many labs as you want"
- For subjects with both lab and lecture, use the separate lab/lecture breakdowns
- Always clarify: "totalSoFar" means classes occurred so far, "totalInSemester" means total in entire semester
- Use overallStats for questions about overall attendance, semester progress, or projections
- Use currentWeek for questions about this week's classes

GOOD RESPONSE EXAMPLES:
• "For ASM: You've attended 4 out of 7 classes so far (57%), with 56 classes remaining this semester. To meet your 75% target, you need to attend at least 47 classes total. You can miss 13 more classes this semester."
• "For CS lectures: You've attended 2 lectures so far, with 42 remaining. You need 45 total to meet the target, so you can miss 1 more lecture this semester."
• "Overall: You've attended 17 out of 35 classes so far (49%), with 28 classes remaining. You need 26 more classes to meet your 75% target, so you can miss 2 more classes this semester."
• "This week: You have 8 classes scheduled from Mon to Fri. You can miss 1 class this week if needed."
• "Progress: You're 30% through the semester with 10 weeks remaining. At your current pace of 49%, you're projected to finish at 49% - you need to improve to reach your 75% target."
• "You're currently 26 percentage points below your 75% target. You need to attend 26 more classes to catch up."

BAD RESPONSE EXAMPLES (DON'T DO THIS):
• "You can miss as many lab sessions as you want" (WRONG - labs count towards attendance)
• "For ASM, you can miss 3 more lectures and 0 more labs." (No context, confusing numbers)
• "You can miss 3 more lectures." (No subject, no time period, no reference point)
• Mixing up totalSoFar (7) with totalInSemester (63) - these are different!

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
