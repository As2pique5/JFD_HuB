/*
  # Add RLS policies for events table

  1. Changes
    - Enable row level security on events table
    - Add policies for CRUD operations based on user roles
    - Ensure proper access control for events

  2. Security
    - Super admins and intermediates can create and update events
    - Only super admins can delete events
    - All authenticated users can view events
*/

-- Enable RLS if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'events'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Super admins and intermediates can create events" ON events;
  DROP POLICY IF EXISTS "Super admins and intermediates can update events" ON events;
  DROP POLICY IF EXISTS "Super admins can delete events" ON events;
  DROP POLICY IF EXISTS "All authenticated users can view events" ON events;
END $$;

-- Create new policies
CREATE POLICY "Super admins and intermediates can create events" ON events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins and intermediates can update events" ON events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins can delete events" ON events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "All authenticated users can view events" ON events
  FOR SELECT TO authenticated
  USING (true);