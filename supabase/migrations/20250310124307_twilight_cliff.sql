/*
  # Fix relationship between projects and profiles tables

  1. Changes
    - Add foreign key relationships between projects and profiles tables
    - Use DO blocks to safely check for existing constraints
    - Add proper error handling

  2. Security
    - No changes to RLS policies
*/

-- First, ensure the profiles table exists and has the correct structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'profiles'
  ) THEN
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      role text NOT NULL CHECK (role IN ('super_admin', 'intermediate', 'standard')),
      phone text,
      birth_date date,
      address text,
      bio text,
      avatar_url text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      active boolean DEFAULT true,
      status text DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
    );
  END IF;
END $$;

-- Drop existing foreign keys if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_manager_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_manager_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_created_by_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_created_by_fkey;
  END IF;
END $$;

-- Add foreign key for manager_id
ALTER TABLE projects
ADD CONSTRAINT projects_manager_id_fkey
FOREIGN KEY (manager_id) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add foreign key for created_by
ALTER TABLE projects
ADD CONSTRAINT projects_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE SET NULL;