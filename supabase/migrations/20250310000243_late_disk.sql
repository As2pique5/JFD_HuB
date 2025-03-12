/*
  # Fix Monthly Contributions Relations and Policies

  1. Changes
    - Add foreign key from monthly_contribution_assignments to profiles
    - Add indexes for better performance
    - Drop and recreate policies with unique names

  2. Security
    - Drop existing policies to avoid conflicts
    - Recreate policies with new unique names
*/

-- Add foreign key from monthly_contribution_assignments to profiles
ALTER TABLE monthly_contribution_assignments
DROP CONSTRAINT IF EXISTS monthly_contribution_assignments_user_id_fkey;

ALTER TABLE monthly_contribution_assignments
ADD CONSTRAINT monthly_contribution_assignments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_user_id_idx
ON monthly_contribution_assignments(user_id);

CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_session_id_idx
ON monthly_contribution_assignments(session_id);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "view_contributions_new" ON contributions;
DROP POLICY IF EXISTS "create_contributions_new" ON contributions;
DROP POLICY IF EXISTS "update_contributions_new" ON contributions;
DROP POLICY IF EXISTS "delete_contributions_new" ON contributions;

-- Enable RLS on contributions table
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "view_contributions_v2"
ON contributions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  )
);

CREATE POLICY "create_contributions_v2"
ON contributions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  )
);

CREATE POLICY "update_contributions_v2"
ON contributions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  )
);

CREATE POLICY "delete_contributions_v2"
ON contributions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);