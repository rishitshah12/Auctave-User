-- Add advanced banner builder columns to trending_banners
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
    ADD COLUMN IF NOT EXISTS gradient_direction TEXT DEFAULT 'to top',
    ADD COLUMN IF NOT EXISTS is_slideshow BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS slides JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS text_x INT,
    ADD COLUMN IF NOT EXISTS text_y INT,
    ADD COLUMN IF NOT EXISTS mobile JSONB DEFAULT '{}'::jsonb;
