-- This seed file will create a super admin user for testing purposes

-- Insert a super admin user
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@jfdhub.com', now(), now(), now())
ON CONFLICT DO NOTHING;

-- Insert the user's profile
INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Admin User', 'admin@jfdhub.com', 'super_admin', now(), now())
ON CONFLICT DO NOTHING;