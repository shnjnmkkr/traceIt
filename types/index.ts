export interface TimetableSlot {
  id: string;
  day: number; // 0 = Monday, 1 = Tuesday, etc.
  startTime: string; // "08:00"
  endTime: string; // "09:00"
  subject: string; // "MC102"
  subjectName: string; // "Discrete Mathematics"
  room?: string;
  instructor?: string;
  status?: "attended" | "absent" | "bunk" | "teacher_absent" | "holiday" | "upcoming" | "unmarked";
  color?: string;
  rowSpan?: number; // For merged cells (labs spanning multiple hours)
  type?: "lecture" | "lab"; // Lab = 1 class, Lecture = rowSpan classes
}

export interface Timetable {
  id: string;
  userId: string;
  name: string;
  semester: string;
  section: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  slots: TimetableSlot[];
}

export interface SubjectAnalytics {
  name: string;
  code: string;
  percentage: number;
  attended: number;
  total: number;
  bunked: number;
  leaves: number;
  teacherAbsent: number;
  // Separate lab and lecture stats
  lab?: {
    attended: number;
    total: number;
    percentage: number;
  };
  lecture?: {
    attended: number;
    total: number;
    percentage: number;
  };
}

export interface Analytics {
  overall: number;
  target: number;
  subjects: SubjectAnalytics[];
  weeklyTrend: { date: string; percentage: number }[];
  heatmapData: { date: string; status: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface UserSettings {
  targetPercentage: number;
  countMassBunkAs: "attended" | "absent" | "exclude";
  countTeacherAbsentAs: "attended" | "absent" | "exclude";
  showAnalytics: boolean;
}
