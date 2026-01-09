-- Version: 1.0.0
-- Version: 1.1.0
-- Description: Migration script to align existing factories table with new CMS schema
-- Author: CMS System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Rename legacy columns if they exist (from AddFactoryForm schema)
DO $$
BEGIN
    -- factory_name -> name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'factory_name') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'name') THEN
            ALTER TABLE factories RENAME COLUMN factory_name TO name;
        END IF;
    END IF;

    -- turn_around_time -> turnaround
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'turn_around_time') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'turnaround') THEN
            ALTER TABLE factories RENAME COLUMN turn_around_time TO turnaround;
        END IF;
    END IF;

    -- promotional_offer -> offer
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'promotional_offer') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'offer') THEN
            ALTER TABLE factories RENAME COLUMN promotional_offer TO offer;
        END IF;
    END IF;
    
    -- specialities -> specialties
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'specialities') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'specialties') THEN
            ALTER TABLE factories RENAME COLUMN specialities TO specialties;
        END IF;
    END IF;
END $$;

-- 3. Add missing columns (Idempotent)
ALTER TABLE factories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) DEFAULT 0;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS turnaround TEXT;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER DEFAULT 0;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS offer TEXT;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Arrays
ALTER TABLE factories ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';
ALTER TABLE factories ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE factories ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';
ALTER TABLE factories ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';

-- JSONB
ALTER TABLE factories ADD COLUMN IF NOT EXISTS machine_slots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS catalog JSONB DEFAULT '{"productCategories": [], "fabricOptions": []}'::jsonb;

-- Metadata
ALTER TABLE factories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE factories ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 4. Data Migration / Cleanup (Optional)
-- Ensure location is populated if country/city exist from legacy data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'city') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factories' AND column_name = 'country') THEN
        UPDATE factories 
        SET location = CONCAT(city, ', ', country) 
        WHERE (location IS NULL OR location = '') AND city IS NOT NULL;
    END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_factories_name ON factories(name);
CREATE INDEX IF NOT EXISTS idx_factories_location ON factories(location);
CREATE INDEX IF NOT EXISTS idx_factories_tags ON factories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_factories_specialties ON factories USING GIN(specialties);

-- 6. Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_factories_updated_at ON factories;
CREATE TRIGGER update_factories_updated_at
    BEFORE UPDATE ON factories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS)
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Public factories are viewable by everyone" ON factories;
CREATE POLICY "Public factories are viewable by everyone"
ON factories FOR SELECT
USING (true);

-- Allow admins to insert/update/delete
DROP POLICY IF EXISTS "Admins can manage factories" ON factories;
CREATE POLICY "Admins can manage factories"
ON factories FOR ALL
USING (auth.jwt() ->> 'email' LIKE '%@auctaveexports.com')
WITH CHECK (auth.jwt() ->> 'email' LIKE '%@auctaveexports.com');