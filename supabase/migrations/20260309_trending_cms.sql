-- Trending CMS Tables
-- Banners & Slideshows
CREATE TABLE IF NOT EXISTS trending_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    cta_text TEXT DEFAULT 'Explore Now',
    cta_link TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trending Products / Catalog
CREATE TABLE IF NOT EXISTS trending_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    image_url TEXT NOT NULL,
    price_range TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    moq TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blogs / Articles
CREATE TABLE IF NOT EXISTS trending_blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    author TEXT,
    cover_image_url TEXT,
    content TEXT DEFAULT '',
    excerpt TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fashion Shorts (video)
CREATE TABLE IF NOT EXISTS trending_shorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    creator TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    views TEXT DEFAULT '0',
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trending_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_shorts ENABLE ROW LEVEL SECURITY;

-- Read policies (anyone authenticated can read)
CREATE POLICY "Anyone can read active banners" ON trending_banners FOR SELECT USING (true);
CREATE POLICY "Anyone can read active products" ON trending_products FOR SELECT USING (true);
CREATE POLICY "Anyone can read published blogs" ON trending_blogs FOR SELECT USING (true);
CREATE POLICY "Anyone can read active shorts" ON trending_shorts FOR SELECT USING (true);

-- Write policies (admins only via service role or app-level checks)
CREATE POLICY "Admins can manage banners" ON trending_banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage products" ON trending_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage blogs" ON trending_blogs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage shorts" ON trending_shorts FOR ALL USING (true) WITH CHECK (true);
