import { TimetableSlot, SubjectAnalytics, UserSettings } from "@/types";
import { eachDayOfInterval, getDay, format, isWithinInterval } from "date-fns";

interface AttendanceRecord {
  date: string; // ISO date string
  slotId: string;
  status: "attended" | "absent" | "bunk" | "teacher_absent" | "holiday";
}

export function calculateAttendanceStats(
  slots: TimetableSlot[],
  attendanceRecords: Map<string, string>, // key: "date-slotId", value: status
  semesterStart: Date,
  semesterEnd: Date,
  settings: UserSettings,
  currentWeekStart: Date
): { overall: number; subjects: SubjectAnalytics[] } {
  // Get all dates in semester up to today or current week end
  const today = new Date();
  const endDate = today < semesterEnd ? today : semesterEnd;
  
  const allDates = eachDayOfInterval({ start: semesterStart, end: endDate });
  
  // Map to track subject-wise stats
  const subjectMap = new Map<string, {
    name: string;
    code: string;
    attended: number;
    total: number;
    bunked: number;
    leaves: number;
    teacherAbsent: number;
    labAttended: number;
    labTotal: number;
    labBunked: number;
    labLeaves: number;
    labTeacherAbsent: number;
    lectureAttended: number;
    lectureTotal: number;
    lectureBunked: number;
    lectureLeaves: number;
    lectureTeacherAbsent: number;
  }>();

  // Initialize subjects
  const uniqueSubjects = Array.from(new Set(slots.map(s => s.subject)));
  uniqueSubjects.forEach(code => {
    const slot = slots.find(s => s.subject === code);
    subjectMap.set(code, {
      name: slot?.subjectName || code,
      code,
      attended: 0,
      total: 0,
      bunked: 0,
      leaves: 0,
      teacherAbsent: 0,
      labAttended: 0,
      labTotal: 0,
      labBunked: 0,
      labLeaves: 0,
      labTeacherAbsent: 0,
      lectureAttended: 0,
      lectureTotal: 0,
      lectureBunked: 0,
      lectureLeaves: 0,
      lectureTeacherAbsent: 0,
    });
  });

  // Process each slot occurrence
  allDates.forEach(date => {
    const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1; // Convert Sunday=0 to our Monday=0 format
    
    // Skip weekends (Saturday=5, Sunday=6)
    if (dayOfWeek >= 5) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const isPastDate = date < today;
    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
    
    // Find all slots for this day
    const daySlots = slots.filter(s => s.day === dayOfWeek);
    
    daySlots.forEach(slot => {
      const recordKey = `${dateStr}-${slot.id}`;
      let status = attendanceRecords.get(recordKey);
      
      // Check if class has occurred (past date OR today but time has passed)
      let hasClassOccurred = isPastDate;
      if (isToday) {
        // For today's classes, check if the start time has passed
        const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
        const classStartTime = new Date(today);
        classStartTime.setHours(slotHour, slotMinute, 0, 0);
        hasClassOccurred = classStartTime < today;
      }
      
      // Handle inverted mode: default to attended, mark absents/bunks
      // Normal mode: default to absent, mark attended
      if (!status && hasClassOccurred) {
        if (settings.invertedMode) {
          status = "attended"; // In inverted mode, unmarked = attended
        } else {
          status = "absent"; // Normal mode, unmarked = absent
        }
      }
      
      // Skip if no record and class hasn't occurred yet (upcoming)
      if (!status) return;

      const subjectStats = subjectMap.get(slot.subject);
      if (!subjectStats) return;

      // Weight calculation:
      // - Labs always count as 1 session (regardless of hours)
      // - Lectures count per hour (rowSpan)
      const weight = slot.type === "lab" ? 1 : (slot.rowSpan || 1);
      const isLab = slot.type === "lab";

      // Handle different statuses based on settings
      switch (status) {
        case "attended":
          subjectStats.attended += weight;
          subjectStats.total += weight;
          if (isLab) {
            subjectStats.labAttended += weight;
            subjectStats.labTotal += weight;
          } else {
            subjectStats.lectureAttended += weight;
            subjectStats.lectureTotal += weight;
          }
          break;
          
        case "absent":
          subjectStats.leaves += weight;
          subjectStats.total += weight;
          if (isLab) {
            subjectStats.labLeaves += weight;
            subjectStats.labTotal += weight;
          } else {
            subjectStats.lectureLeaves += weight;
            subjectStats.lectureTotal += weight;
          }
          break;
          
        case "bunk":
          subjectStats.bunked += weight;
          if (isLab) {
            subjectStats.labBunked += weight;
          } else {
            subjectStats.lectureBunked += weight;
          }
          if (settings.countMassBunkAs === "attended") {
            subjectStats.attended += weight;
            subjectStats.total += weight;
            if (isLab) {
              subjectStats.labAttended += weight;
              subjectStats.labTotal += weight;
            } else {
              subjectStats.lectureAttended += weight;
              subjectStats.lectureTotal += weight;
            }
          } else if (settings.countMassBunkAs === "absent") {
            subjectStats.total += weight;
            if (isLab) {
              subjectStats.labTotal += weight;
            } else {
              subjectStats.lectureTotal += weight;
            }
          }
          // If "exclude", don't add to total
          break;
          
        case "teacher_absent":
          subjectStats.teacherAbsent += weight;
          if (isLab) {
            subjectStats.labTeacherAbsent += weight;
          } else {
            subjectStats.lectureTeacherAbsent += weight;
          }
          if (settings.countTeacherAbsentAs === "attended") {
            subjectStats.attended += weight;
            subjectStats.total += weight;
            if (isLab) {
              subjectStats.labAttended += weight;
              subjectStats.labTotal += weight;
            } else {
              subjectStats.lectureAttended += weight;
              subjectStats.lectureTotal += weight;
            }
          } else if (settings.countTeacherAbsentAs === "absent") {
            subjectStats.total += weight;
            if (isLab) {
              subjectStats.labTotal += weight;
            } else {
              subjectStats.lectureTotal += weight;
            }
          }
          // If "exclude", don't add to total
          break;
          
        case "holiday":
          // Don't count holidays in any stats
          break;
      }
    });
  });

  // Calculate percentages and overall
  const subjects: SubjectAnalytics[] = Array.from(subjectMap.values()).map(s => {
    const subject: SubjectAnalytics = {
      name: s.name,
      code: s.code,
      percentage: s.total > 0 ? Math.round((s.attended / s.total) * 10000) / 100 : 0,
      attended: s.attended,
      total: s.total,
      bunked: s.bunked,
      leaves: s.leaves,
      teacherAbsent: s.teacherAbsent,
    };
    
    // Add lab stats if subject has lab component
    if (s.labTotal > 0) {
      subject.lab = {
        attended: s.labAttended,
        total: s.labTotal,
        percentage: Math.round((s.labAttended / s.labTotal) * 10000) / 100,
        bunked: s.labBunked,
        leaves: s.labLeaves,
        teacherAbsent: s.labTeacherAbsent,
      };
    }
    
    // Add lecture stats if subject has lecture component
    if (s.lectureTotal > 0) {
      subject.lecture = {
        attended: s.lectureAttended,
        total: s.lectureTotal,
        percentage: Math.round((s.lectureAttended / s.lectureTotal) * 10000) / 100,
        bunked: s.lectureBunked,
        leaves: s.lectureLeaves,
        teacherAbsent: s.lectureTeacherAbsent,
      };
    }
    
    return subject;
  });

  // Calculate overall attendance
  // If includeLabsInOverall is false, exclude lab sessions from overall calculation
  let totalAttended = 0;
  let totalClasses = 0;

  if (settings.includeLabsInOverall !== false) {
    // Include everything (default behavior)
    totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
    totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  } else {
    // Exclude labs - only count lectures
    subjects.forEach(s => {
      if (s.lecture) {
        totalAttended += s.lecture.attended;
        totalClasses += s.lecture.total;
      } else if (!s.lab) {
        // Subject has no lab/lecture breakdown, include it (likely lecture-only)
        totalAttended += s.attended;
        totalClasses += s.total;
      }
    });
  }

  const overall = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 10000) / 100 : 0;

  return { overall, subjects };
}
