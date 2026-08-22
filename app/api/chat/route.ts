import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { calculateAttendanceStats } from '@/lib/attendance-calculator';
import { format, eachDayOfInterval, getDay, differenceInDays, differenceInWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { rateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limiter';
import { DAYS_FULL as DAYS } from '@/lib/timetable-constants';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Block guests from using AI chat
    if (user.user_metadata?.is_guest) {
      return NextResponse.json(
        { error: 'AI chat is not available for guest users. Please sign up to use this feature.' },
        { status: 403 }
      );
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
      invertedMode: settingsData.inverted_mode ?? false, // Default to false if column doesn't exist
    } : {
      targetPercentage: 75,
      countMassBunkAs: 'absent',
      countTeacherAbsentAs: 'attended',
      showAnalytics: true,
      includeLabsInOverall: true,
      invertedMode: false,
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
    // Slots already marked as "holiday" in the attendance map are excluded from the total
    // so that "canMiss" and "remaining" projections reflect reality.
    // NOTE: attendance calculation (calculateAttendanceStats) is NOT touched here.
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

      // Count classes for entire semester, skipping slots already marked as holiday
      allSemesterDates.forEach(date => {
        const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1;
        if (dayOfWeek >= 5) return; // Skip weekends

        const dateStr = format(date, "yyyy-MM-dd");
        const daySlots = slots.filter(s => s.day === dayOfWeek);

        daySlots.forEach(slot => {
          const stats = subjectTotals.get(slot.subject);
          if (!stats) return;

          // If this specific slot on this date is already marked as a holiday, exclude it
          // from the semester total so "remaining" and "canMiss" are accurate.
          const recordKey = `${dateStr}-${slot.id}`;
          if (attendanceMap.get(recordKey) === "holiday") return;

          const slotType = slot.type || 'lecture';
          const weight = slotType === "lab" ? (slot.rowSpan || 2) : (slot.rowSpan || 1);
          stats.total += weight;
          
          if (slotType === "lab") {
            stats.labTotal += weight;
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
          const weight = slotType === "lab" ? (slot.rowSpan || 2) : (slot.rowSpan || 1);
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
      
      // Daily schedule breakdown for next 7 days
      const getDailySchedule = (startDate: Date, days: number) => {
        const dailySchedules: any[] = [];
        for (let i = 0; i < days; i++) {
          const date = addDays(startDate, i);
          if (date > semesterEnd) break;
          
          const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1;
          if (dayOfWeek >= 5) continue; // Skip weekends
          
          const dateStr = format(date, "yyyy-MM-dd");
          const isPastDate = date < today;
          const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          
          const daySlots = slots.filter(s => s.day === dayOfWeek);
          const dayClasses: any[] = [];
          
          daySlots.forEach(slot => {
            const slotType = slot.type || 'lecture';
            const weight = slotType === "lab" ? 1 : (slot.rowSpan || 1);
            
            // Check if class has occurred
            let hasClassOccurred = isPastDate;
            let attendanceStatus = null;
            if (isToday) {
              const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
              const classStartTime = new Date(today);
              classStartTime.setHours(slotHour, slotMinute, 0, 0);
              hasClassOccurred = classStartTime < today;
            }
            
            if (hasClassOccurred) {
              const recordKey = `${dateStr}-${slot.id}`;
              attendanceStatus = attendanceMap.get(recordKey) || "absent";
            }
            
            dayClasses.push({
              subject: slot.subjectName,
              code: slot.subject,
              time: `${slot.startTime} - ${slot.endTime}`,
              type: slotType,
              room: slot.room || 'Not specified',
              instructor: slot.instructor || 'Not specified',
              duration: weight,
              status: attendanceStatus, // "attended", "absent", "bunk", "teacher_absent", "holiday", or null if upcoming
            });
          });
          
          if (dayClasses.length > 0) {
            dailySchedules.push({
              date: dateStr,
              dayName: format(date, 'EEEE'),
              dateFormatted: format(date, 'MMM dd, yyyy'),
              isToday: isToday,
              isPast: isPastDate,
              classes: dayClasses,
              totalClasses: dayClasses.reduce((sum, c) => sum + c.duration, 0),
            });
          }
        }
        return dailySchedules;
      };
      
      const todaySchedule = getDailySchedule(today, 1);
      const tomorrowSchedule = getDailySchedule(addDays(today, 1), 1);
      
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
        schedule: {
          today: todaySchedule.length > 0 ? todaySchedule[0] : null,
          tomorrow: tomorrowSchedule.length > 0 ? tomorrowSchedule[0] : null,
        },
      };
    };

    const overallStats = calculateOverallStats(attendanceMap, slots);

    // 6. Format schedule for LLM (clearly distinguish labs and lectures)
    const schedule = slots.map(slot => ({
      day: DAYS[slot.day],
      time: `${slot.startTime}-${slot.endTime}`,
      subject: slot.subjectName,
      code: slot.subject,
      type: slot.type || 'lecture',
      durationHours: slot.type === 'lab' ? (slot.rowSpan || 2) : (slot.rowSpan || 1),
      room: slot.room || undefined,
      instructor: slot.instructor || undefined,
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
            unit: "class hours",
            attendedHours: s.attended,
            totalHoursSoFar: s.total, // Class hours occurred so far (up to today)
            totalHoursInSemester: totalInSemester, // Total class hours in entire semester
            remainingHours: remaining, // Class hours remaining in semester
            targetHoursNeeded: targetClasses, // Class hours needed to meet target percentage
            minimumHoursNeeded: minimumNeeded, // Must attend this many more class hours
            canMissHours: canMiss, // Can miss this many class hours this semester
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
        massBunkCounting: settings.countMassBunkAs, // "attended", "absent", or "exclude"
        teacherAbsentCounting: settings.countTeacherAbsentAs, // "attended", "absent", or "exclude"
        includeLabsInOverall: settings.includeLabsInOverall, // Whether labs are included in overall attendance
        invertedMode: settings.invertedMode, // If true, unmarked classes default to attended instead of absent
      },
    };

    // 8. Call Groq API with fallback models (groq/compound 70B main, then groq/compound-mini 8B fallback)
    const models = ['groq/compound', 'groq/compound-mini'];
    let completion;
    let lastError;
    let usedFallback = false;

    const systemPrompt = `You are traceIt's AI Attendance & Timetable Advisor — a helpful, intelligent, and direct companion for university students.

### GROUND TRUTH & METRICS DEFINITION
1. **Units of Measurement**:
   - ALL attendance numbers, limits, and targets are expressed strictly in **HOURS OF CLASSES** (e.g. "you can miss 4 hours of classes", "you must attend 10 more hours").
   - **Lecture sessions** are counted per hour of duration (e.g. 1 hour or 2 hours depending on lecture length).
   - **Lab sessions** are worth **2 hours** by default.

2. **Inverted Tracking Mode**:
   - **Mode Status**: ${settings.invertedMode ? 'ACTIVE (Inverted Mode: Unmarked classes default to attended; students only mark missed classes)' : 'Standard Mode (Default to absent until marked)'}.
   - **Crucial**: All pre-calculated metrics in \`context\` (hoursAttended, hoursCanMiss, minimumHoursToAttend) ALREADY factor this in correctly. Never invert or recalculate the numbers.

### CURRENT CONTEXT
- **Today's Date**: ${format(today, 'EEEE, MMMM dd, yyyy')}
- **Semester Duration**: ${format(semesterStart, 'MMM dd, yyyy')} – ${format(semesterEnd, 'MMM dd, yyyy')}
- **Target Attendance Goal**: ${settings.targetPercentage}%

### PRE-CALCULATED DATA (EXPRESSED IN HOURS)
Use these exact numbers directly from \`context\`:
${JSON.stringify(context)}

### RESPONSE GUIDELINES
1. **Always Answer in Hours**:
   - Frame EVERY attendance answer, target requirement, and "can miss" allowance in terms of **hours of classes** (e.g. "You have attended 12 hours out of 16 hours held so far (75%). You can miss 4 more hours of Physics this semester.").
   - Always distinguish between hours held so far (\`hoursSoFar\`) versus total hours in the entire semester (\`totalHoursInSemester\`).

2. **Lab vs Lecture Clarity**:
   - For subjects with labs, clarify that lab sessions are 2 hours by default. Mention separate lab and lecture hour breakdowns when relevant.

3. **Tone & Formatting (CRITICAL FOR MOBILE & SIDEBAR CHAT UI)**:
   - Sound like a helpful, encouraging academic advisor.
   - **STRICT NO-TABLE RULE**: NEVER generate multi-column Markdown tables (tables with | columns | like summary tables). They break and wrap into unreadable vertical text on mobile and chat sidebars.
   - **Use Bulleted Cards**: Format subject breakdowns and summaries using clean headers and bullet points:
     - **PSA (EE303)**: Attended 15h / 15h (100%) | Can miss: **20 hours** (Target: 60h/80h)
     - **PE (EE301)**: Attended 10h / 12h (83%) | Can miss: **17 hours** (Target: 59h/78h)
   - Use bold for key numbers (**75%**, **12 hours**) and bullet lists for readability.
   - Do NOT output raw JSON or internal code variable names.

4. **Scope Limitation**:
   - If asked about non-timetable/non-attendance topics, respond politely: "I can only help with your timetable and attendance in traceIt."`;

    for (const model of models) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.2,
          max_tokens: 500,
        });
                // Success - log if we used fallback
        if (usedFallback) {
          console.log(`Used fallback model: ${model} (original: ${models[0]})`);
        }
        break; // Success - exit loop
      } catch (err: any) {
        lastError = err;
        
        // Check if it's a rate limit error
        if (err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('quota')) {
          console.warn(`Rate limit/quota hit for ${model}, trying fallback...`);
          usedFallback = true;
        }
        
        continue; // Try next model
      }
    }

    if (!completion) {
      throw lastError || new Error('All models failed');
    }

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Track AI chat usage
    try {
      await supabase.from('feature_usage').insert({
        user_id: user.id,
        feature_name: 'ai_chat',
        feature_data: {
          message_length: message.length,
          model_used: completion.model || 'unknown',
          used_fallback: usedFallback,
        },
        is_guest: false, // Guests are blocked, so this will always be false
      });
    } catch (trackError) {
      // Don't fail the request if tracking fails
      console.error('Failed to track AI chat usage:', trackError);
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
