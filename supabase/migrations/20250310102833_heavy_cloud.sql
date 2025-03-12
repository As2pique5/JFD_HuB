/*
  # Add event contributions relations and columns

  1. Changes
    - Add columns to events table for contribution tracking
    - Add indexes for faster filtering and lookups
    - Add foreign key relationships between event contributions and assignments

  2. Security
    - No changes to RLS policies
*/

-- Add columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS requires_contribution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contribution_status text DEFAULT 'pending' 
CHECK (contribution_status IN ('pending', 'setup', 'completed'));

-- Add index for faster filtering of events requiring contributions
CREATE INDEX IF NOT EXISTS events_requires_contribution_idx ON events(requires_contribution);

-- Add foreign key relationship between event_contribution_assignments and event_contributions
ALTER TABLE event_contribution_assignments
ADD COLUMN IF NOT EXISTS contribution_id uuid REFERENCES event_contributions(id) ON DELETE CASCADE;

-- Add index for the new foreign key
CREATE INDEX IF NOT EXISTS event_contribution_assignments_contribution_id_idx 
ON event_contribution_assignments(contribution_id);

-- Update existing assignments to link with contributions if any exist
DO $$
BEGIN
  UPDATE event_contribution_assignments a
  SET contribution_id = c.id
  FROM event_contributions c
  WHERE a.event_id = c.event_id
  AND a.contribution_id IS NULL;
END $$;