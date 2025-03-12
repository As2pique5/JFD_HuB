/*
  # Add Row Level Security policies for projects table

  1. Changes
    - Enable RLS on projects table
    - Add policies for:
      - Super admins and intermediates can create projects
      - Super admins and intermediates can update projects
      - Super admins can delete projects
      - All authenticated users can view projects

  2. Security
    - Ensure proper access control based on user roles
    - Protect sensitive project data
*/

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  -- Allow super admins and intermediates to create projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Super admins and intermediates can create projects'
  ) THEN
    CREATE POLICY "Super admins and intermediates can create projects"
      ON projects
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

  -- Allow super admins and intermediates to update projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Super admins and intermediates can update projects'
  ) THEN
    CREATE POLICY "Super admins and intermediates can update projects"
      ON projects
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;

  -- Allow super admins to delete projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Super admins can delete projects'
  ) THEN
    CREATE POLICY "Super admins can delete projects"
      ON projects
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

  -- Allow all authenticated users to view projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can view all projects'
  ) THEN
    CREATE POLICY "Users can view all projects"
      ON projects
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;