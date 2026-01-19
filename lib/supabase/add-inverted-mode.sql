-- Add inverted_mode column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS inverted_mode BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN user_settings.inverted_mode IS 'If true, attendance starts at 100% and user marks absents instead of presents';
