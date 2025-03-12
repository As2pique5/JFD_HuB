/*
  # Fix authentication state and cleanup

  1. Changes
    - Ensure proper role assignments
    - Reset profile statuses
    - Add missing profiles
    
  2. Security
    - Maintain data integrity
    - Preserve user accounts
*/

-- Ensure all users have proper role assignments
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  (
    SELECT to_jsonb(role)
    FROM profiles
    WHERE profiles.id = auth.users.id
  )
)
WHERE id IN (
  SELECT id FROM profiles
);

-- Reset profiles status to active where needed
UPDATE profiles
SET status = 'active'
WHERE status IS NULL;

-- Add missing profile records for any auth users
INSERT INTO profiles (id, email, name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'standard'),
  'active',
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;