-- Add all advanced banner builder columns to trending_banners
-- This combines new_columns + advanced_features migrations into one

-- Visual & layout columns
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS focal_point_x INT DEFAULT 50,
    ADD COLUMN IF NOT EXISTS focal_point_y INT DEFAULT 50,
    ADD COLUMN IF NOT EXISTS image_fit TEXT DEFAULT 'cover',
    ADD COLUMN IF NOT EXISTS banner_height INT DEFAULT 320,
    ADD COLUMN IF NOT EXISTS overlay_opacity INT DEFAULT 60,
    ADD COLUMN IF NOT EXISTS text_position TEXT DEFAULT 'bottom-left',
    ADD COLUMN IF NOT EXISTS heading_size INT DEFAULT 36,
    ADD COLUMN IF NOT EXISTS subtitle_size INT DEFAULT 18,
    ADD COLUMN IF NOT EXISTS gradient_color TEXT DEFAULT '0,0,0',
    ADD COLUMN IF NOT EXISTS gradient_direction TEXT DEFAULT 'to top';

-- Slideshow & media columns
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS is_slideshow BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS slides JSONB DEFAULT '[]'::jsonb;

-- Free-positioned text overlay
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS text_x INT,
    ADD COLUMN IF NOT EXISTS text_y INT;

-- Mobile overrides
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS mobile JSONB DEFAULT '{}'::jsonb;

-- CTA styling (button appearance)
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS cta_style JSONB DEFAULT '{}'::jsonb;

-- Auto-scroll / slideshow animation settings
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS auto_scroll_interval INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS pause_on_hover BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS slide_animation TEXT DEFAULT 'fade',
    ADD COLUMN IF NOT EXISTS transition_duration INT DEFAULT 700,
    ADD COLUMN IF NOT EXISTS hover_animation TEXT DEFAULT 'scale';

-- Reload the PostgREST schema cache so Supabase API recognizes new columns immediately
NOTIFY pgrst, 'reload schema';
