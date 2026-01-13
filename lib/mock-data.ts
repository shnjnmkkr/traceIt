import { Timetable, ChatMessage, UserSettings } from "@/types";

// Default timetable with sample data - will be replaced with user-created timetable
export const defaultTimetable: Timetable = {
  id: "tt-1",
  userId: "user-1",
  name: "Spring 2026 - CSE A",
  semester: "Spring 2026",
  section: "CSE A",
  startDate: "2026-01-01",
  endDate: "2026-04-22",
  slots: [
    // Monday
    { id: "s1", day: 0, startTime: "09:00", endTime: "10:00", subject: "CS101", subjectName: "Data Structures", room: "Lab 1", instructor: "Dr. Smith" },
    { id: "s2", day: 0, startTime: "10:00", endTime: "11:00", subject: "MA201", subjectName: "Discrete Mathematics", room: "Room 302", instructor: "Prof. Johnson" },
    { id: "s3", day: 0, startTime: "13:00", endTime: "14:00", subject: "CS102", subjectName: "Algorithms", room: "Room 201", instructor: "Dr. Williams" },
    
    // Tuesday
    { id: "s4", day: 1, startTime: "09:00", endTime: "10:00", subject: "CS103", subjectName: "Operating Systems", room: "Lab 2", instructor: "Prof. Davis" },
    { id: "s5", day: 1, startTime: "11:00", endTime: "12:00", subject: "CS101", subjectName: "Data Structures", room: "Lab 1", instructor: "Dr. Smith" },
    { id: "s6", day: 1, startTime: "14:00", endTime: "15:00", subject: "MA201", subjectName: "Discrete Mathematics", room: "Room 302", instructor: "Prof. Johnson" },
    
    // Wednesday
    { id: "s7", day: 2, startTime: "10:00", endTime: "11:00", subject: "CS102", subjectName: "Algorithms", room: "Room 201", instructor: "Dr. Williams" },
    { id: "s8", day: 2, startTime: "11:00", endTime: "12:00", subject: "CS103", subjectName: "Operating Systems", room: "Lab 2", instructor: "Prof. Davis" },
    { id: "s9", day: 2, startTime: "13:00", endTime: "15:00", subject: "CS104", subjectName: "Database Lab", room: "Lab 3", instructor: "Dr. Brown", rowSpan: 2 },
    
    // Thursday
    { id: "s10", day: 3, startTime: "09:00", endTime: "10:00", subject: "MA201", subjectName: "Discrete Mathematics", room: "Room 302", instructor: "Prof. Johnson" },
    { id: "s11", day: 3, startTime: "10:00", endTime: "11:00", subject: "CS101", subjectName: "Data Structures", room: "Lab 1", instructor: "Dr. Smith" },
    { id: "s12", day: 3, startTime: "14:00", endTime: "15:00", subject: "CS103", subjectName: "Operating Systems", room: "Lab 2", instructor: "Prof. Davis" },
    
    // Friday
    { id: "s13", day: 4, startTime: "09:00", endTime: "10:00", subject: "CS102", subjectName: "Algorithms", room: "Room 201", instructor: "Dr. Williams" },
    { id: "s14", day: 4, startTime: "11:00", endTime: "12:00", subject: "CS104", subjectName: "Database Systems", room: "Room 401", instructor: "Dr. Brown" },
    { id: "s15", day: 4, startTime: "13:00", endTime: "14:00", subject: "CS101", subjectName: "Data Structures", room: "Lab 1", instructor: "Dr. Smith" },
  ],
};

// Default user settings
export const defaultSettings: UserSettings = {
  targetPercentage: 75,
  countMassBunkAs: "absent",
  countTeacherAbsentAs: "attended",
  showAnalytics: true,
};

// Mock attendance records (key: "date-slotId", value: status)
// Sample data for the first week of January 2026
export const mockAttendanceRecords = new Map<string, string>([
  // Week 1: Jan 6-10, 2026 (Mon-Fri)
  // Monday Jan 6
  ["2026-01-06-s1", "attended"],
  ["2026-01-06-s2", "attended"],
  ["2026-01-06-s3", "bunk"],
  
  // Tuesday Jan 7
  ["2026-01-07-s4", "attended"],
  ["2026-01-07-s5", "absent"],
  ["2026-01-07-s6", "attended"],
  
  // Wednesday Jan 8
  ["2026-01-08-s7", "teacher_absent"],
  ["2026-01-08-s8", "attended"],
  ["2026-01-08-s9", "attended"],
  
  // Thursday Jan 9
  ["2026-01-09-s10", "attended"],
  ["2026-01-09-s11", "attended"],
  ["2026-01-09-s12", "bunk"],
  
  // Friday Jan 10 - marked as holiday
  ["2026-01-10-s13", "holiday"],
  ["2026-01-10-s14", "holiday"],
  ["2026-01-10-s15", "holiday"],
]);

// Mock chat messages
export const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hey! I'm your attendance assistant. Ask me anything about your attendance patterns, predictions, or strategies to maintain your target percentage.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
];

// Helper function to get mock analytics data
export function getMockAnalytics() {
  return {
    overall: 0,
    target: 75,
    subjects: [],
    weeklyTrend: [],
    heatmapData: [],
  };
}
