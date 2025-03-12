/*
  # Fix relationship between project_participants and profiles tables

  1. Changes
    - Add foreign key relationship between project_participants.user_id and profiles.id
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

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_participants_user_id_fkey'
    AND table_name = 'project_participants'
  ) THEN
    ALTER TABLE project_participants DROP CONSTRAINT project_participants_user_id_fkey;
  END IF;
END $$;

-- Add foreign key for user_id
ALTER TABLE project_participants
ADD CONSTRAINT project_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;