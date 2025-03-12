/*
  # Add contribution flag to events table

  1. Changes
    - Add `requires_contribution` column to events table to indicate if an event requires contributions
    - Add `contribution_status` column to track the contribution setup status
    - Add check constraint to ensure valid contribution status values

  2. Notes
    - The `requires_contribution` flag helps identify events that need financial contributions
    - The `contribution_status` helps track whether contributions have been set up for eligible events
*/

-- Add contribution-related columns to events table
ALTER TABLE events 
ADD COLUMN requires_contribution boolean DEFAULT false,
ADD COLUMN contribution_status text DEFAULT 'pending'
CHECK (contribution_status IN ('pending', 'setup', 'completed'));

-- Add comment to explain the columns
COMMENT ON COLUMN events.requires_contribution IS 'Indicates if this event requires financial contributions from members';
COMMENT ON COLUMN events.contribution_status IS 'Status of contribution setup: pending (not set up), setup (contribution created), completed (all contributions received)';