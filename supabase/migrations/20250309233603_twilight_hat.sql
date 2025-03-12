/*
  # Fix Monthly Contributions Relationships and Policies

  1. Changes
    - Create index for monthly contribution assignments user_id
    - Update RLS policies with proper naming and checks
*/

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_user_id_idx
ON monthly_contribution_assignments(user_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- monthly_contribution_sessions
  DROP POLICY IF EXISTS "view_monthly_contribution_sessions" ON monthly_contribution_sessions;
  DROP POLICY IF EXISTS "create_monthly_contribution_sessions" ON monthly_contribution_sessions;
  DROP POLICY IF EXISTS "update_monthly_contribution_sessions" ON monthly_contribution_sessions;
  DROP POLICY IF EXISTS "delete_monthly_contribution_sessions" ON monthly_contribution_sessions;

  -- monthly_contribution_assignments
  DROP POLICY IF EXISTS "view_monthly_contribution_assignments" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "create_monthly_contribution_assignments" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "update_monthly_contribution_assignments" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "delete_monthly_contribution_assignments" ON monthly_contribution_assignments;

  -- contributions
  DROP POLICY IF EXISTS "view_contributions" ON contributions;
  DROP POLICY IF EXISTS "create_contributions" ON contributions;
  DROP POLICY IF EXISTS "update_contributions" ON contributions;
  DROP POLICY IF EXISTS "delete_contributions" ON contributions;

  -- audit_logs
  DROP POLICY IF EXISTS "view_audit_logs" ON audit_logs;
  DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
END $$;

-- Create new policies
-- monthly_contribution_sessions
CREATE POLICY "view_monthly_contribution_sessions_new"
  ON monthly_contribution_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "create_monthly_contribution_sessions_new"
  ON monthly_contribution_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "update_monthly_contribution_sessions_new"
  ON monthly_contribution_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "delete_monthly_contribution_sessions_new"
  ON monthly_contribution_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- monthly_contribution_assignments
CREATE POLICY "view_monthly_contribution_assignments_new"
  ON monthly_contribution_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "create_monthly_contribution_assignments_new"
  ON monthly_contribution_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "update_monthly_contribution_assignments_new"
  ON monthly_contribution_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "delete_monthly_contribution_assignments_new"
  ON monthly_contribution_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- contributions
CREATE POLICY "view_contributions_new"
  ON contributions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "create_contributions_new"
  ON contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "update_contributions_new"
  ON contributions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "delete_contributions_new"
  ON contributions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- audit_logs
CREATE POLICY "view_audit_logs_new"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "insert_audit_logs_new"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);