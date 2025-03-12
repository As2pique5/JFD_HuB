/*
  # Fix Contributions Table Relationships

  1. Changes
    - Add foreign key constraint from contributions.user_id to users.id (if not exists)
    - Add index on user_id for better join performance (if not exists)

  2. Security
    - No changes to RLS policies
*/

-- Check if the constraint exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'contributions_user_id_fkey'
    AND table_name = 'contributions'
  ) THEN
    ALTER TABLE contributions
    ADD CONSTRAINT contributions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better join performance if it doesn't exist
CREATE INDEX IF NOT EXISTS contributions_user_id_idx
ON contributions(user_id);