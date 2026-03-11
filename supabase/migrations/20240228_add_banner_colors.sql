ALTER TABLE trending_banners
ADD COLUMN IF NOT EXISTS heading_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS subtitle_color text DEFAULT 'rgba(255,255,255,0.9)';

-- Reload the PostgREST schema cache so Supabase API recognizes new columns immediately
NOTIFY pgrst, 'reload schema';