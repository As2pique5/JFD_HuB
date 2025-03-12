/*
  # Add relationship between projects and profiles tables

  1. Changes
    - Add foreign key relationships between projects and profiles tables if they don't exist
    - Use DO blocks to safely check for existing constraints
    - Add proper error handling

  2. Security
    - No changes to RLS policies
*/

DO $$ 
BEGIN
  -- Check if manager_id foreign key exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_manager_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;

  -- Check if created_by foreign key exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_created_by_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;