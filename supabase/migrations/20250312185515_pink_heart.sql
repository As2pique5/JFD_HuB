/*
  # Fix authentication state synchronization

  1. Changes
    - Add handle_new_user function to properly initialize profiles
    - Add sync_auth_role function to maintain role consistency
    - Add trigger to sync roles on auth changes
    
  2. Security
    - Ensure proper role assignment
    - Maintain role consistency between auth and profiles
*/

-- Create function to handle new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard'),
    'active'
  );

  -- Set initial auth role
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object('role', COALESCE(NEW.raw_user_meta_data->>'role', 'standard'))
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create function to sync auth role
CREATE OR REPLACE FUNCTION sync_auth_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update auth metadata when profile role changes
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_user_role_trigger ON profiles;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create trigger for role changes
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_auth_role();

-- Update existing users
DO $$
BEGIN
  -- Update auth metadata for all profiles
  UPDATE auth.users u
  SET raw_app_meta_data = jsonb_build_object('role', p.role)
  FROM profiles p
  WHERE u.id = p.id;
END $$;