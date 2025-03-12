/*
  # Fix Monthly Contributions Relationships

  1. Changes
    - Update monthly_contribution_assignments to reference profiles instead of users
    - Add indexes for better join performance
    - Update RLS policies to use profiles table
*/

-- Update foreign key constraint for monthly_contribution_assignments
ALTER TABLE monthly_contribution_assignments
DROP CONSTRAINT IF EXISTS monthly_contribution_assignments_user_id_fkey;

ALTER TABLE monthly_contribution_assignments
ADD CONSTRAINT monthly_contribution_assignments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Create indexes for better join performance
CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_user_id_idx
ON monthly_contribution_assignments(user_id);

CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_session_id_idx
ON monthly_contribution_assignments(session_id);

-- Update RLS policies to use profiles table
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "view_monthly_contribution_assignments_new" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "create_monthly_contribution_assignments_new" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "update_monthly_contribution_assignments_new" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "delete_monthly_contribution_assignments_new" ON monthly_contribution_assignments;

  -- Create new policies
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
END $$;