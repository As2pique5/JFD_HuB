/*
  # Add Row Level Security policies for project_phases table

  1. Changes
    - Enable RLS on project_phases table
    - Add policies for:
      - Super admins and intermediates can create project phases
      - Super admins and intermediates can update project phases
      - Super admins can delete project phases
      - All authenticated users can view project phases

  2. Security
    - Ensure proper access control based on user roles
    - Protect project phase data integrity
*/

-- Enable RLS
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  -- Allow super admins and intermediates to create project phases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_phases' AND policyname = 'Super admins and intermediates can create project phases'
  ) THEN
    CREATE POLICY "Super admins and intermediates can create project phases"
      ON project_phases
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

  -- Allow super admins and intermediates to update project phases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_phases' AND policyname = 'Super admins and intermediates can update project phases'
  ) THEN
    CREATE POLICY "Super admins and intermediates can update project phases"
      ON project_phases
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

  -- Allow super admins to delete project phases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_phases' AND policyname = 'Super admins can delete project phases'
  ) THEN
    CREATE POLICY "Super admins can delete project phases"
      ON project_phases
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

  -- Allow all authenticated users to view project phases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_phases' AND policyname = 'Users can view all project phases'
  ) THEN
    CREATE POLICY "Users can view all project phases"
      ON project_phases
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;