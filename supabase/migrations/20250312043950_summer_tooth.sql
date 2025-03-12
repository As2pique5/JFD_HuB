/*
  # Fix family relationships schema

  1. Changes
    - Drop existing family_relationships table
    - Recreate table with correct foreign key constraints
    - Add proper indexes and RLS policies
    
  2. Security
    - Enable RLS
    - Add policies for different user roles
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS family_relationships;

-- Create family_relationships table with correct constraints
CREATE TABLE family_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_member_id, to_member_id, relationship_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS family_relationships_from_member_id_idx ON family_relationships(from_member_id);
CREATE INDEX IF NOT EXISTS family_relationships_to_member_id_idx ON family_relationships(to_member_id);

-- Enable RLS
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all family relationships"
  ON family_relationships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert family relationships"
  ON family_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins and intermediates can update family relationships"
  ON family_relationships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins can delete family relationships"
  ON family_relationships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_family_relationships_updated_at
  BEFORE UPDATE ON family_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();