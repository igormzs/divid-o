-- Add preferred_currency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';

-- Note: To enable avatar uploads, you must create a public bucket named 'avatars' 
-- in your Supabase project. 
-- You can do this in the Supabase Dashboard under Storage -> New Bucket.
-- Set it to Public.
