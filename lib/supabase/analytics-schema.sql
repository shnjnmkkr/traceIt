-- Analytics Tables for Admin Dashboard
-- Tracks page views, user activity, and feature usage

-- Page Views Table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- For tracking guest sessions
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_is_guest ON page_views(is_guest);

-- Feature Usage Table (tracks specific feature interactions)
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  feature_name TEXT NOT NULL, -- 'ai_chat', 'timetable_create', 'attendance_mark', etc.
  feature_data JSONB, -- Additional context (e.g., message count, template used)
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_name ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created_at ON feature_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_is_guest ON feature_usage(is_guest);

-- RLS Policies
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics data
CREATE POLICY "Admins can view page views"
  ON page_views FOR SELECT
  USING (is_admin(auth.uid()) = TRUE);

CREATE POLICY "Anyone can insert page views"
  ON page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view feature usage"
  ON feature_usage FOR SELECT
  USING (is_admin(auth.uid()) = TRUE);

CREATE POLICY "Anyone can insert feature usage"
  ON feature_usage FOR INSERT
  WITH CHECK (true);
