/*
  # Fix events and profiles relationship

  1. Changes
    - Drop existing foreign key constraints if they exist
    - Add correct foreign key constraints for organizer_id and created_by
    - Add indexes for better query performance

  2. Notes
    - Ensures proper relationship between events and profiles tables
    - Improves query performance with indexes
    - Maintains data integrity with foreign key constraints
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_organizer_id_fkey'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_organizer_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_created_by_fkey'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_created_by_fkey;
  END IF;
END $$;

-- Add correct foreign key constraints
ALTER TABLE events
ADD CONSTRAINT events_organizer_id_fkey
FOREIGN KEY (organizer_id) REFERENCES profiles(id)
ON DELETE SET NULL;

ALTER TABLE events
ADD CONSTRAINT events_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS events_organizer_id_idx ON events(organizer_id);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS events_type_idx ON events(type);