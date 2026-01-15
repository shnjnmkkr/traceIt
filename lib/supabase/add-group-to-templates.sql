-- Add group column to community_templates table
ALTER TABLE community_templates 
ADD COLUMN IF NOT EXISTS group TEXT;

-- Add index for filtering by group
CREATE INDEX IF NOT EXISTS idx_community_templates_group 
ON community_templates(group) WHERE group IS NOT NULL;
