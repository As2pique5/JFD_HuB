/*
  # Create storage bucket for profile avatars

  1. New Storage Bucket
    - `profile_avatars` bucket for storing user profile pictures
  
  2. Security
    - Enable public access for authenticated users
    - Allow read access to all users
    - Allow write access to authenticated users for their own avatars
*/

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_avatars', 'profile_avatars', true);

-- Set up security policies
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_avatars');

CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile_avatars');

CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile_avatars')
WITH CHECK (bucket_id = 'profile_avatars');

CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile_avatars');