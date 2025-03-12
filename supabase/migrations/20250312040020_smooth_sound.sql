/*
  # Fix documents and profiles relationship

  1. Changes
    - Add foreign key relationship between documents.uploaded_by and profiles.id
    - Update RLS policies for documents table
    - Add indexes for better performance

  2. Security
    - Ensure proper access control for documents
    - Protect document data integrity
*/

-- Drop existing foreign key if it exists
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

-- Add foreign key relationship to profiles
ALTER TABLE documents
ADD CONSTRAINT documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx ON documents(uploaded_by);

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all documents" ON documents;
DROP POLICY IF EXISTS "Super admins and intermediates can insert documents" ON documents;
DROP POLICY IF EXISTS "Super admins and intermediates can update documents" ON documents;
DROP POLICY IF EXISTS "Super admins can delete documents" ON documents;

-- Create new policies
CREATE POLICY "Users can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins and intermediates can update documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins can delete documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );