/*
  # Add status column to profiles table

  1. Changes
    - Add status column to profiles table with default value 'active'
    - Update existing profiles to have status 'active'
*/

-- Check if status column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Update existing profiles to have status 'active'
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- Add check constraint to ensure status is valid
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('active', 'inactive'));