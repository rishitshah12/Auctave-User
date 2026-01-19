-- Run this SQL in your Supabase SQL Editor to fix the "record 'new' has no field 'updated_at'" error.
-- This error occurs because a database trigger is trying to update the 'updated_at' column, but the column is missing from the table.

ALTER TABLE public.factories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;