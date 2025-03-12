/*
  # Fix authentication role handling

  1. Changes
    - Update handle_new_user function to properly set role
    - Add function to sync auth metadata with profile
    - Add trigger to maintain role consistency
    
  2. Security
    - Ensure proper role assignment
    - Maintain role consistency between auth and profiles
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_user_role_trigger ON profiles;

-- Drop existing functions with CASCADE
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_auth_role() CASCADE;

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
BEGIN
  -- Get role from metadata or default to 'standard'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'standard');

  -- Create profile with proper role
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    v_role,
    'active',
    NOW(),
    NOW()
  );

  -- Ensure auth metadata has correct role
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(v_role)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create function to sync auth metadata with profile
CREATE OR REPLACE FUNCTION sync_auth_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update auth metadata when profile role changes
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger for role changes
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_auth_role();

-- Update existing users to ensure consistency
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Update auth metadata for all profiles
  FOR r IN SELECT id, role FROM profiles
  LOOP
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(r.role)
    )
    WHERE id = r.id;
  END LOOP;
END $$;