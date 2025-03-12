/*
  # Fix Contributions Table Relationships

  1. Changes
    - Add foreign key constraint from contributions.user_id to profiles.id
    - Add index on user_id for better join performance
    - Update existing foreign key to point to profiles instead of users

  2. Security
    - No changes to RLS policies
*/

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'contributions_user_id_fkey'
    AND table_name = 'contributions'
  ) THEN
    ALTER TABLE contributions DROP CONSTRAINT contributions_user_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint to profiles table
ALTER TABLE contributions
ADD CONSTRAINT contributions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Create index for better join performance if it doesn't exist
CREATE INDEX IF NOT EXISTS contributions_user_id_idx
ON contributions(user_id);