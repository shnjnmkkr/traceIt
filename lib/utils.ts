import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    attended: "#16a34a",
    absent: "#ef4444",
    bunk: "#f97316",
    teacher_absent: "#3b82f6",
    holiday: "#6b7280",
    upcoming: "#eab308",
    unmarked: "#404040",
  };
  return colors[status] || colors.unmarked;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    attended: "Attended",
    absent: "Absent",
    bunk: "Mass Bunked",
    teacher_absent: "Teacher Absent",
    holiday: "Holiday",
    upcoming: "Upcoming",
    unmarked: "Not Marked",
  };
  return labels[status] || "Unknown";
}
