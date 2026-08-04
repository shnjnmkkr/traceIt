// Single source of truth for the weekly grid shape, shared by every
// component that renders or edits the timetable (dashboard grid, create
// flow, add-slot dialog, merge/unmerge handlers).

export const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
