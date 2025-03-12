/*
  # Fix role synchronization between auth and profiles

  1. Changes
    - Add function to ensure role consistency
    - Update existing profiles with correct roles
    - Add trigger to maintain role sync
*/

-- Create function to sync roles
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
BEGIN
  -- Get role from auth.users metadata
  SELECT COALESCE(
    raw_user_meta_data->>'role',
    'standard'
  ) INTO v_role
  FROM auth.users
  WHERE id = NEW.id;

  -- Update the role if it's different
  IF NEW.role != v_role THEN
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role sync
DROP TRIGGER IF EXISTS sync_user_role_trigger ON profiles;
CREATE TRIGGER sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Update existing profiles with roles from auth metadata
DO $$
BEGIN
  UPDATE profiles p
  SET role = COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = p.id),
    'standard'
  )
  WHERE EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.id
    AND (u.raw_user_meta_data->>'role') IS NOT NULL
    AND p.role != (u.raw_user_meta_data->>'role')
  );
END $$;