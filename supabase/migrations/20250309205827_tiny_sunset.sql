/*
  # Storage configuration for profile avatars

  1. Storage Setup
    - Enable RLS on storage.objects
    - Create profile_avatars bucket
    - Configure storage policies for avatar management

  2. Security
    - Public read access for avatars
    - Authenticated users can manage their own avatars
    - Safe policy handling with IF EXISTS checks
*/

-- Enable RLS on storage.objects if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_avatars', 'profile_avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Give users authenticated access to folder 1" ON storage.objects;
    DROP POLICY IF EXISTS "Give public access to folder 1" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create new policies with owner check
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_avatars');

CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'profile_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile_avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);