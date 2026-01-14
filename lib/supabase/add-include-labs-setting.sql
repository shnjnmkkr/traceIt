-- Add include_labs_in_overall column to user_settings
-- This migration adds the new column with a default value of TRUE

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS include_labs_in_overall BOOLEAN DEFAULT TRUE;

-- Update existing rows to have TRUE as default (in case they were created before this column existed)
UPDATE user_settings 
SET include_labs_in_overall = TRUE 
WHERE include_labs_in_overall IS NULL;
