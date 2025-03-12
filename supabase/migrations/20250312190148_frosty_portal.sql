/*
  # Fix authentication role handling

  1. Changes
    - Use raw_app_meta_data instead of raw_user_meta_data for roles
    - Add function to ensure role consistency
    - Add trigger to maintain role sync
*/

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_auth_role() CASCADE;
DROP FUNCTION IF EXISTS sync_user_role() CASCADE;

-- Create function to handle new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile
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
    'standard',
    'active'
  );

  -- Set initial auth role
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object('role', 'standard')
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

  -- Log the role change
  INSERT INTO audit_logs (
    action,
    user_id,
    target_id,
    details
  ) VALUES (
    'role_change',
    NEW.id,
    NEW.id,
    jsonb_build_object(
      'old_role', OLD.role,
      'new_role', NEW.role,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create trigger for role changes
DROP TRIGGER IF EXISTS sync_user_role_trigger ON profiles;
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

  -- Ensure all profiles have standard role if not set
  UPDATE profiles
  SET role = 'standard'
  WHERE role IS NULL;
END $$;