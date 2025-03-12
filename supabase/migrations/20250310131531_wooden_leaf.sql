/*
  # Fix Project Contributions Schema

  1. Changes
    - Add foreign key relationship between project_contribution_assignments and project_contributions
    - Add missing indexes for better performance
    - Add missing RLS policies if they don't exist

  2. Security
    - Enable RLS on both tables
    - Add policies for super_admin and intermediate roles
*/

-- Add foreign key relationship
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_contribution_assignments' 
    AND column_name = 'contribution_id'
  ) THEN
    ALTER TABLE project_contribution_assignments
    ADD COLUMN contribution_id uuid REFERENCES project_contributions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS project_contributions_project_id_idx ON project_contributions(project_id);
CREATE INDEX IF NOT EXISTS project_contribution_assignments_contribution_id_idx ON project_contribution_assignments(contribution_id);

-- Enable RLS
ALTER TABLE project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contribution_assignments ENABLE ROW LEVEL SECURITY;

-- Project contributions policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' 
    AND policyname = 'Super admins and intermediates can insert project contributions'
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' 
    AND policyname = 'Super admins and intermediates can update project contributions'
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' 
    AND policyname = 'Super admins can delete project contributions'
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contributions' 
    AND policyname = 'Users can view all project contributions'
  ) THEN
    CREATE POLICY "Users can view all project contributions"
      ON project_contributions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Project contribution assignments policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' 
    AND policyname = 'Super admins and intermediates can insert project contribution assignments'
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' 
    AND policyname = 'Super admins and intermediates can update project contribution assignments'
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' 
    AND policyname = 'Super admins can delete project contribution assignments'
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_contribution_assignments' 
    AND policyname = 'Users can view all project contribution assignments'
  ) THEN
    CREATE POLICY "Users can view all project contribution assignments"
      ON project_contribution_assignments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;