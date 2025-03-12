/*
  # Fix profiles table structure

  1. Changes
    - Remove status column reference from profiles table
    - Add active column to profiles table for member status tracking
  
  2. Security
    - No changes to RLS policies
*/

-- Check if active column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;