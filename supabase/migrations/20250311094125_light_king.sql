/*
  # Fix project contributions and payments

  1. Changes
    - Add RLS policies for project_contributions table
    - Add RLS policies for project_contribution_assignments table
    - Add RLS policies for contributions table
    - Add indexes for better performance
    
  2. Security
    - Ensure proper access control for all operations
    - Drop existing policies before recreating them
*/

-- Enable RLS on all relevant tables
ALTER TABLE project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contribution_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view project contributions" ON project_contributions;
DROP POLICY IF EXISTS "Super admins and intermediates can insert project contributions" ON project_contributions;
DROP POLICY IF EXISTS "Super admins and intermediates can update project contributions" ON project_contributions;

DROP POLICY IF EXISTS "Anyone can view project contribution assignments" ON project_contribution_assignments;
DROP POLICY IF EXISTS "Super admins and intermediates can insert project contribution assignments" ON project_contribution_assignments;
DROP POLICY IF EXISTS "Super admins and intermediates can update project contribution assignments" ON project_contribution_assignments;

DROP POLICY IF EXISTS "Anyone can view contributions" ON contributions;
DROP POLICY IF EXISTS "Super admins and intermediates can insert contributions" ON contributions;
DROP POLICY IF EXISTS "Super admins and intermediates can update contributions" ON contributions;

-- Create helper function for RLS check if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin_or_intermediate()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Project Contributions policies
CREATE POLICY "Anyone can view project contributions"
  ON project_contributions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert project contributions"
  ON project_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_intermediate());

CREATE POLICY "Super admins and intermediates can update project contributions"
  ON project_contributions
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_intermediate());

-- Project Contribution Assignments policies
CREATE POLICY "Anyone can view project contribution assignments"
  ON project_contribution_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert project contribution assignments"
  ON project_contribution_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_intermediate());

CREATE POLICY "Super admins and intermediates can update project contribution assignments"
  ON project_contribution_assignments
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_intermediate());

-- Contributions policies
CREATE POLICY "Anyone can view contributions"
  ON contributions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert contributions"
  ON contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_intermediate());

CREATE POLICY "Super admins and intermediates can update contributions"
  ON contributions
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_intermediate());

-- Create indexes for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'project_contributions_project_id_idx'
  ) THEN
    CREATE INDEX project_contributions_project_id_idx 
      ON project_contributions(project_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'project_contribution_assignments_project_id_user_id_idx'
  ) THEN
    CREATE INDEX project_contribution_assignments_project_id_user_id_idx 
      ON project_contribution_assignments(project_id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'contributions_project_id_user_id_idx'
  ) THEN
    CREATE INDEX contributions_project_id_user_id_idx 
      ON contributions(project_id, user_id);
  END IF;
END $$;