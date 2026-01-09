export const CRM_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS crm_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES factories(id),
    product_name TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    tasks JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

export const CRM_RLS_SQL = `
ALTER TABLE crm_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own orders" 
ON crm_orders FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all orders" 
ON crm_orders FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@auctaveexports.com');
`;

export const FACTORIES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    location TEXT,
    description TEXT,
    rating NUMERIC(3, 1) DEFAULT 0,
    turnaround TEXT,
    minimum_order_quantity INTEGER DEFAULT 0,
    offer TEXT,
    cover_image_url TEXT,
    gallery TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    specialties TEXT[] DEFAULT '{}',
    machine_slots JSONB DEFAULT '[]'::jsonb,
    catalog JSONB DEFAULT '{"productCategories": [], "fabricOptions": []}'::jsonb,
    status TEXT DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

export const FACTORIES_RLS_SQL = `
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public factories are viewable by everyone"
ON factories FOR SELECT USING (true);

CREATE POLICY "Admins can manage factories"
ON factories FOR ALL
USING (auth.jwt() ->> 'email' LIKE '%@auctaveexports.com');
`;