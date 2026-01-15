-- Add group field to community_templates table
ALTER TABLE community_templates 
ADD COLUMN IF NOT EXISTS "group" TEXT;

-- Add index for group field for better query performance
CREATE INDEX IF NOT EXISTS idx_community_templates_group 
ON community_templates("group") 
WHERE "group" IS NOT NULL;
