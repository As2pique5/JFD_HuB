/*
  # Add Row Level Security policies for project contributions

  1. Changes
    - Enable RLS on project_contributions and project_contribution_assignments tables
    - Add policies for:
      - Super admins and intermediates can manage contributions and assignments
      - All authenticated users can view contributions and assignments
    
  2. Security
    - Ensure proper access control based on user roles
    - Protect contribution data integrity
*/

-- Enable RLS
ALTER TABLE project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contribution_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for project_contributions
DO $$ 
BEGIN
  -- Allow super admins and intermediates to insert contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' AND policyname = 'Super admins and intermediates can insert project contributions'
  ) THEN
    CREATE POLICY "Super admins and intermediates can insert project contributions"
      ON project_contributions
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

  -- Allow super admins and intermediates to update contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' AND policyname = 'Super admins and intermediates can update project contributions'
  ) THEN
    CREATE POLICY "Super admins and intermediates can update project contributions"
      ON project_contributions
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

  -- Allow super admins to delete contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' AND policyname = 'Super admins can delete project contributions'
  ) THEN
    CREATE POLICY "Super admins can delete project contributions"
      ON project_contributions
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

  -- Allow all authenticated users to view contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' AND policyname = 'Users can view all project contributions'
  ) THEN
    CREATE POLICY "Users can view all project contributions"
      ON project_contributions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create policies for project_contribution_assignments
DO $$ 
BEGIN
  -- Allow super admins and intermediates to insert assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' AND policyname = 'Super admins and intermediates can insert project contribution assignments'
  ) THEN
    CREATE POLICY "Super admins and intermediates can insert project contribution assignments"
      ON project_contribution_assignments
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

  -- Allow super admins and intermediates to update assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' AND policyname = 'Super admins and intermediates can update project contribution assignments'
  ) THEN
    CREATE POLICY "Super admins and intermediates can update project contribution assignments"
      ON project_contribution_assignments
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

  -- Allow super admins to delete assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' AND policyname = 'Super admins can delete project contribution assignments'
  ) THEN
    CREATE POLICY "Super admins can delete project contribution assignments"
      ON project_contribution_assignments
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

  -- Allow all authenticated users to view assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' AND policyname = 'Users can view all project contribution assignments'
  ) THEN
    CREATE POLICY "Users can view all project contribution assignments"
      ON project_contribution_assignments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;