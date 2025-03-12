/*
  # Fix events and profiles relationship

  1. Changes
    - Add foreign key constraint for organizer_id referencing profiles table
    - Add index for better query performance
    - Add foreign key constraint for created_by referencing users table

  2. Notes
    - Ensures proper relationship between events and profiles tables
    - Improves query performance with indexes
    - Maintains data integrity with foreign key constraints
*/

-- Add foreign key constraints
DO $$ BEGIN
  -- Add organizer_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_organizer_id_fkey'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_organizer_id_fkey
    FOREIGN KEY (organizer_id) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;

  -- Add created_by foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_created_by_fkey'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS events_organizer_id_idx ON events(organizer_id);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);