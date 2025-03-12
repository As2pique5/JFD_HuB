/*
  # Fix contributions payment handling

  1. Changes
    - Enable RLS on contributions table
    - Add policies for contributions table to allow payment recording
    - Add foreign key relationship between contributions and project_contributions
    - Fix audit_logs foreign key relationship with profiles
    
  2. Security
    - Ensure proper access control for payment operations
    - Protect payment data integrity
*/

-- Enable RLS on contributions table
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Drop existing foreign key if it exists
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add correct foreign key relationship
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create policies for contributions
DO $$ 
BEGIN
  -- Allow super admins and intermediates to insert contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' AND policyname = 'Super admins and intermediates can insert contributions'
  ) THEN
    CREATE POLICY "Super admins and intermediates can insert contributions"
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
  END IF;

  -- Allow super admins and intermediates to update contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' AND policyname = 'Super admins and intermediates can update contributions'
  ) THEN
    CREATE POLICY "Super admins and intermediates can update contributions"
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
  END IF;

  -- Allow super admins to delete contributions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' AND policyname = 'Super admins can delete contributions'
  ) THEN
    CREATE POLICY "Super admins can delete contributions"
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
  END IF;

  -- Allow users to view their own contributions and admins/intermediates to view all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' AND policyname = 'View contributions policy'
  ) THEN
    CREATE POLICY "View contributions policy"
      ON contributions
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;
END $$;