-- Add RLS policy to allow admins to delete any community template
-- This policy allows admins (checked via is_admin function) to delete any template

CREATE POLICY "Admins can delete any template"
  ON community_templates FOR DELETE
  USING (
    is_admin(auth.uid()) = TRUE
  );
