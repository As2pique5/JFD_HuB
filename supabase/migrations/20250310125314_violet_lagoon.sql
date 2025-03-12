/*
  # Add Row Level Security policies for project_participants table

  1. Changes
    - Enable RLS on project_participants table
    - Add policies for:
      - Super admins and intermediates can add project participants
      - Super admins can delete project participants
      - All authenticated users can view project participants

  2. Security
    - Ensure proper access control based on user roles
    - Protect project participant data integrity
*/

-- Enable RLS
ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  -- Allow super admins and intermediates to add project participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_participants' AND policyname = 'Super admins and intermediates can add project participants'
  ) THEN
    CREATE POLICY "Super admins and intermediates can add project participants"
      ON project_participants
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;

  -- Allow super admins to delete project participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_participants' AND policyname = 'Super admins can delete project participants'
  ) THEN
    CREATE POLICY "Super admins can delete project participants"
      ON project_participants
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'super_admin'
        )
      );
  END IF;

  -- Allow all authenticated users to view project participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_participants' AND policyname = 'Users can view all project participants'
  ) THEN
    CREATE POLICY "Users can view all project participants"
      ON project_participants
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;