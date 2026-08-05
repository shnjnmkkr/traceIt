-- Core Schema: Timetables, Slots, Attendance
-- Run this FIRST, before any other file in lib/supabase/*.sql.
-- Everything else in this directory is an incremental migration on top
-- of these three tables (settings, admin, community templates, analytics).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Timetables -----------------------------------------------------------
-- One row per timetable a user has created. Only one is "active" at a
-- time; creating a new timetable deactivates the previous one instead
-- of deleting it, so historical attendance data is never lost.
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  semester TEXT,
  section TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetables_user_active ON timetables(user_id, is_active);

-- Timetable Slots --------------------------------------------------------
-- One row per class slot on the weekly grid. day_of_week is 0-4
-- (Monday-Friday). row_span > 1 represents a merged, multi-hour block
-- (e.g. a 2-hour lab occupying two consecutive time columns).
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT,
  room TEXT,
  instructor TEXT,
  color TEXT,
  row_span SMALLINT DEFAULT 1,
  slot_type TEXT DEFAULT 'lecture' CHECK (slot_type IN ('lecture', 'lab')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_timetable_id ON timetable_slots(timetable_id);

-- Attendance Records -------------------------------------------------------
-- One row per (user, slot, date). Upserted on `user_id, slot_id, date`
-- so re-marking a class overwrites the previous status instead of
-- creating duplicates. Absence of a row for a past slot is what the
-- attendance engine treats as "unmarked" (see lib/attendance-calculator.ts).
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attended', 'absent', 'bunk', 'teacher_absent', 'holiday')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, slot_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_slot_id ON attendance_records(slot_id);

-- Row Level Security -----------------------------------------------------
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timetables" ON timetables
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage slots of own timetables" ON timetable_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM timetables t WHERE t.id = timetable_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM timetables t WHERE t.id = timetable_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users manage own attendance records" ON attendance_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Keep updated_at fresh on both tables that track it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_timetables_updated_at ON timetables;
CREATE TRIGGER update_timetables_updated_at
  BEFORE UPDATE ON timetables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
