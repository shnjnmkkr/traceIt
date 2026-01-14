-- Bug Reports and Feature Suggestions Table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Report Type
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  user_email TEXT, -- Optional
  device_info TEXT,
  screenshot_url TEXT, -- URL to screenshot if uploaded to storage
  
  -- Bug-specific fields
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  expected_behavior TEXT,
  actual_behavior TEXT,
  steps_to_reproduce TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Optional user reference (if logged in)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_type ON bug_reports(type);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);

-- RLS Policies
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can create bug reports (public)
CREATE POLICY "Anyone can create bug reports"
  ON bug_reports FOR INSERT
  WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON bug_reports FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_admin(auth.uid()) = TRUE
  );

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON bug_reports FOR SELECT
  USING (is_admin(auth.uid()) = TRUE);

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON bug_reports FOR UPDATE
  USING (is_admin(auth.uid()) = TRUE)
  WITH CHECK (is_admin(auth.uid()) = TRUE);

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON bug_reports FOR DELETE
  USING (is_admin(auth.uid()) = TRUE);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_reports_updated_at();
