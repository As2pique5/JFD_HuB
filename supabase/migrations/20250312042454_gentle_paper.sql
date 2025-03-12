/*
  # Fix family members and profiles relationship

  1. Changes
    - Drop existing foreign key constraints
    - Add correct foreign key relationships between family_members and profiles
    - Add indexes for better performance
    - Update RLS policies

  2. Security
    - Maintain proper access control
    - Ensure data integrity
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'family_members_user_id_fkey'
  ) THEN
    ALTER TABLE family_members DROP CONSTRAINT family_members_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'family_members_created_by_fkey'
  ) THEN
    ALTER TABLE family_members DROP CONSTRAINT family_members_created_by_fkey;
  END IF;
END $$;

-- Add correct foreign key relationships
ALTER TABLE family_members
ADD CONSTRAINT family_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE SET NULL;

ALTER TABLE family_members
ADD CONSTRAINT family_members_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS family_members_user_id_idx ON family_members(user_id);
CREATE INDEX IF NOT EXISTS family_members_created_by_idx ON family_members(created_by);

-- Enable RLS on family_members table
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all family members" ON family_members;
DROP POLICY IF EXISTS "Super admins and intermediates can insert family members" ON family_members;
DROP POLICY IF EXISTS "Super admins and intermediates can update family members" ON family_members;
DROP POLICY IF EXISTS "Super admins can delete family members" ON family_members;

-- Create new policies
CREATE POLICY "Users can view all family members"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert family members"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins and intermediates can update family members"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins can delete family members"
  ON family_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );