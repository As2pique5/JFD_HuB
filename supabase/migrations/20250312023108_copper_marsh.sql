/*
  # Fix event contributions relationships and queries

  1. Changes
    - Add missing foreign key relationships
    - Update existing assignments to link with their contributions
    - Add necessary indexes for performance
    
  2. Security
    - No changes to RLS policies
*/

-- Drop existing foreign key if it exists
ALTER TABLE event_contribution_assignments 
DROP CONSTRAINT IF EXISTS event_contribution_assignments_event_id_fkey;

-- Add proper foreign key relationships
ALTER TABLE event_contribution_assignments
ADD CONSTRAINT event_contribution_assignments_event_id_fkey
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS event_contributions_event_id_idx 
ON event_contributions(event_id);

CREATE INDEX IF NOT EXISTS event_contribution_assignments_event_id_idx 
ON event_contribution_assignments(event_id);

-- Update the relationship between assignments and contributions
DO $$ 
BEGIN
  -- Add contribution_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_contribution_assignments' 
    AND column_name = 'contribution_id'
  ) THEN
    ALTER TABLE event_contribution_assignments
    ADD COLUMN contribution_id uuid REFERENCES event_contributions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS event_contribution_assignments_contribution_id_idx 
ON event_contribution_assignments(contribution_id);

-- Update existing assignments to link with their contributions
UPDATE event_contribution_assignments a
SET contribution_id = c.id
FROM event_contributions c
WHERE a.event_id = c.event_id
AND a.contribution_id IS NULL;