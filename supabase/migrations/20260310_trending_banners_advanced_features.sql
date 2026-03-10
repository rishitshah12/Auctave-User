-- Add CTA styling, auto-scroll, animation columns to trending_banners
ALTER TABLE trending_banners
    ADD COLUMN IF NOT EXISTS cta_style JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS auto_scroll_interval INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS pause_on_hover BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS slide_animation TEXT DEFAULT 'fade',
    ADD COLUMN IF NOT EXISTS transition_duration INT DEFAULT 700,
    ADD COLUMN IF NOT EXISTS hover_animation TEXT DEFAULT 'scale';
