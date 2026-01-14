-- Add voting columns to community_templates table
ALTER TABLE community_templates 
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Create votes tracking table (to prevent duplicate votes)
CREATE TABLE IF NOT EXISTS community_template_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  template_id UUID NOT NULL REFERENCES community_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  
  UNIQUE(template_id, user_id)
);

-- Indexes for votes table
CREATE INDEX IF NOT EXISTS idx_template_votes_template ON community_template_votes(template_id);
CREATE INDEX IF NOT EXISTS idx_template_votes_user ON community_template_votes(user_id);

-- RLS Policies for votes
ALTER TABLE community_template_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes
CREATE POLICY "Votes are viewable by everyone"
  ON community_template_votes FOR SELECT
  USING (true);

-- Authenticated users can vote
CREATE POLICY "Users can vote on templates"
  ON community_template_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON community_template_votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON community_template_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update vote counts (allows negative values)
CREATE OR REPLACE FUNCTION update_template_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE community_templates 
      SET upvotes = COALESCE(upvotes, 0) + 1 
      WHERE id = NEW.template_id;
    ELSE
      UPDATE community_templates 
      SET downvotes = COALESCE(downvotes, 0) + 1 
      WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Remove old vote (allows negative values)
    IF OLD.vote_type = 'upvote' THEN
      UPDATE community_templates 
      SET upvotes = COALESCE(upvotes, 0) - 1 
      WHERE id = OLD.template_id;
    ELSE
      UPDATE community_templates 
      SET downvotes = COALESCE(downvotes, 0) - 1 
      WHERE id = OLD.template_id;
    END IF;
    -- Add new vote
    IF NEW.vote_type = 'upvote' THEN
      UPDATE community_templates 
      SET upvotes = COALESCE(upvotes, 0) + 1 
      WHERE id = NEW.template_id;
    ELSE
      UPDATE community_templates 
      SET downvotes = COALESCE(downvotes, 0) + 1 
      WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove vote (allows negative values)
    IF OLD.vote_type = 'upvote' THEN
      UPDATE community_templates 
      SET upvotes = COALESCE(upvotes, 0) - 1 
      WHERE id = OLD.template_id;
    ELSE
      UPDATE community_templates 
      SET downvotes = COALESCE(downvotes, 0) - 1 
      WHERE id = OLD.template_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_vote_counts ON community_template_votes;
CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON community_template_votes
  FOR EACH ROW EXECUTE FUNCTION update_template_vote_counts();

-- Update index for sorting by votes
CREATE INDEX IF NOT EXISTS idx_community_templates_votes ON community_templates((upvotes - downvotes) DESC);
