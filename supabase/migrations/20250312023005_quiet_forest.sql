/*
  # Fix event contributions relationships

  1. Changes
    - Add missing foreign key relationship between event_contribution_assignments and event_contributions
    - Update existing assignments to link with their contributions
    - Add indexes for better performance
    
  2. Security
    - No changes to RLS policies
*/

-- Add contribution_id column to event_contribution_assignments if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_contribution_assignments' 
    AND column_name = 'contribution_id'
  ) THEN
    ALTER TABLE event_contribution_assignments
    ADD COLUMN contribution_id uuid REFERENCES event_contributions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS event_contribution_assignments_contribution_id_idx 
ON event_contribution_assignments(contribution_id);

-- Update existing assignments to link with their contributions
UPDATE event_contribution_assignments a
SET contribution_id = c.id
FROM event_contributions c
WHERE a.event_id = c.event_id
AND a.contribution_id IS NULL;

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'event_contributions_event_id_fkey'
  ) THEN
    ALTER TABLE event_contributions
    ADD CONSTRAINT event_contributions_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;