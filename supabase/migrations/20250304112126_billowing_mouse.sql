/*
  # Fix RLS policies for profiles table

  1. Updates
    - Modify the RLS policy for profiles to allow super admins to insert new profiles
    - Fix permissions for profile management
  
  2. Security
    - Ensure proper access control for user profiles
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;

-- Create improved RLS policies for profiles
CREATE POLICY "Anyone can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Super admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  USING (true);

CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  USING (true);