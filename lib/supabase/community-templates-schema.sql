-- Community Templates Table
CREATE TABLE IF NOT EXISTS community_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  university TEXT,
  course TEXT,
  semester TEXT,
  group TEXT,
  
  -- Creator Info
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- Template Data (JSON structure of slots)
  template_data JSONB NOT NULL,
  
  -- Stats
  usage_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_public BOOLEAN DEFAULT TRUE,
  reported_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_templates_public ON community_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_templates_university ON community_templates(university);
CREATE INDEX IF NOT EXISTS idx_community_templates_usage ON community_templates(usage_count DESC);

-- RLS Policies
ALTER TABLE community_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read public templates
CREATE POLICY "Public templates are viewable by everyone"
  ON community_templates FOR SELECT
  USING (is_public = TRUE);

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON community_templates FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON community_templates FOR UPDATE
  USING (auth.uid() = creator_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON community_templates FOR DELETE
  USING (auth.uid() = creator_id);
