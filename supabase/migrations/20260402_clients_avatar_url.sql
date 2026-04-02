-- Add avatar_url column to clients table so admins can see client profile pictures
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url text;
