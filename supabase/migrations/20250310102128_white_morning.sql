/*
  # Add contribution columns to events table
  
  1. Changes
    - Add `requires_contribution` boolean column to events table
    - Add `contribution_status` text column to events table with check constraint
    - Add index for faster filtering of events requiring contributions
  
  2. Purpose
    - Track which events require financial contributions
    - Track the status of contribution setup for events
*/

-- Add columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS requires_contribution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contribution_status text DEFAULT 'pending' 
CHECK (contribution_status IN ('pending', 'setup', 'completed'));

-- Add index for faster filtering of events requiring contributions
CREATE INDEX IF NOT EXISTS events_requires_contribution_idx ON events(requires_contribution);

-- Add comment explaining the columns
COMMENT ON COLUMN events.requires_contribution IS 'Indicates if this event requires financial contributions from members';
COMMENT ON COLUMN events.contribution_status IS 'Status of contribution setup: pending (not set up), setup (contribution created), completed (all contributions received)';