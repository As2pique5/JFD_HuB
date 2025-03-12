/*
  # Fix family relationships RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create new RLS policies with proper permissions
    - Add helper functions for role checking
    
  2. Security
    - Ensure proper access control for family relationships
    - Maintain data integrity during validation
*/

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view family relationships" ON family_relationships;
DROP POLICY IF EXISTS "Super admins and intermediates can create family relationships" ON family_relationships;
DROP POLICY IF EXISTS "Super admins and intermediates can update family relationships" ON family_relationships;
DROP POLICY IF EXISTS "Super admins can delete family relationships" ON family_relationships;

-- Create helper function for checking admin/intermediate role if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin_or_intermediate()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  );
END;
$$;

-- Create helper function for checking super admin role if it doesn't exist
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  );
END;
$$;

-- Enable RLS on family_relationships table
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "Anyone can view family relationships"
  ON family_relationships
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admins and intermediates can create family relationships"
  ON family_relationships
  FOR INSERT
  TO public
  WITH CHECK (is_admin_or_intermediate());

CREATE POLICY "Super admins and intermediates can update family relationships"
  ON family_relationships
  FOR UPDATE
  TO public
  USING (is_admin_or_intermediate());

CREATE POLICY "Super admins can delete family relationships"
  ON family_relationships
  FOR DELETE
  TO public
  USING (is_super_admin());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_or_intermediate() TO public;
GRANT EXECUTE ON FUNCTION is_super_admin() TO public;