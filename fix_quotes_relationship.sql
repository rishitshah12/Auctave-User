-- Fix the foreign key relationship for the quotes table to allow joining with clients

-- 1. Drop the existing foreign key to auth.users (if it exists with the default name)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;

-- 2. Add a new foreign key referencing the public.clients table
ALTER TABLE quotes
ADD CONSTRAINT quotes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.clients (id);