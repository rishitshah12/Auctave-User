-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. User Management & Profiles
-- ==========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For auth
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100),
    job_role VARCHAR(100),
    category_specialization VARCHAR(255), -- Could be normalized if strict validation needed
    yearly_est_revenue VARCHAR(100)
);

-- ==========================================
-- 2. Factory Sourcing Data
-- ==========================================

CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    turnaround_time VARCHAR(100), -- e.g., "25-35 days"
    minimum_order_quantity INTEGER,
    offer_text VARCHAR(255), -- e.g., "10% OFF", "FREE SAMPLES"
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE factory_gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0
);

-- Lookup tables for Many-to-Many relationships
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL -- e.g., "Prime", "Sustainable"
);

CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL -- e.g., "Sedex", "ISO 9001"
);

CREATE TABLE garment_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL -- e.g., "T-shirt", "Denim"
);

-- Junction Tables
CREATE TABLE factory_tags (
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (factory_id, tag_id)
);

CREATE TABLE factory_certifications (
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    certification_id INTEGER REFERENCES certifications(id) ON DELETE CASCADE,
    PRIMARY KEY (factory_id, certification_id)
);

CREATE TABLE factory_specialties (
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES garment_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (factory_id, category_id)
);

-- Factory Capacity / Machines
CREATE TABLE factory_machine_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    machine_type VARCHAR(255) NOT NULL,
    available_slots INTEGER NOT NULL,
    total_slots INTEGER NOT NULL,
    next_available_date DATE
);

-- Factory Catalog
CREATE TABLE factory_catalog_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT
);

CREATE TABLE factory_catalog_fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    composition VARCHAR(255),
    use_cases TEXT
);

-- ==========================================
-- 3. Quotes & Orders
-- ==========================================

CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    factory_id UUID REFERENCES factories(id),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Responded, Accepted, Declined, In Negotiation
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Order Details Snapshot
    category VARCHAR(100),
    fabric_quality VARCHAR(255),
    weight_gsm INTEGER,
    style_option TEXT,
    quantity INTEGER,
    target_price DECIMAL(10, 2),
    shipping_destination VARCHAR(255),
    packaging_reqs TEXT,
    labeling_reqs TEXT
);

CREATE TABLE quote_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_url TEXT
);

-- CRM Orders (Converted from Quotes)
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY, -- e.g., "PO-2024-001" (Custom ID format)
    user_id UUID REFERENCES users(id),
    factory_id UUID REFERENCES factories(id),
    quote_id UUID REFERENCES quote_requests(id), -- Link back to original quote
    product_summary VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active'
);

-- ==========================================
-- 4. Project Management (CRM)
-- ==========================================

CREATE TABLE order_tasks (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    responsible_party VARCHAR(100), -- e.g., "Merch Team", "Jane D."
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) DEFAULT 'TO DO', -- TO DO, IN PROGRESS, COMPLETE
    quantity_completed INTEGER DEFAULT 0,
    color_code VARCHAR(50) -- Hex code or Tailwind class for UI
);

CREATE TABLE order_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50), -- PO, Logistics, Finance
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_url TEXT
);

-- ==========================================
-- 5. Logistics & Billing
-- ==========================================

CREATE TABLE billing_records (
    id VARCHAR(50) PRIMARY KEY, -- e.g., "ESC-001"
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    total_amount DECIMAL(12, 2) NOT NULL,
    amount_released DECIMAL(12, 2) DEFAULT 0.00,
    amount_held DECIMAL(12, 2) DEFAULT 0.00,
    status VARCHAR(50) -- Partially Paid, Funded, Awaiting Milestone
);

CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    status_message VARCHAR(255) NOT NULL, -- e.g., "In Production", "In Transit"
    event_date DATE,
    is_complete BOOLEAN DEFAULT FALSE,
    is_in_progress BOOLEAN DEFAULT FALSE,
    icon_key VARCHAR(50), -- e.g., "Truck", "Ship", "Anchor" (Mapped in frontend)
    display_order INTEGER
);

-- ==========================================
-- 6. Content (Trends)
-- ==========================================

CREATE TABLE trend_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    author VARCHAR(100),
    publish_date DATE,
    image_url TEXT,
    content_url TEXT -- Link to full article
);

CREATE TABLE fashion_shorts (
    id SERIAL PRIMARY KEY,
    creator_handle VARCHAR(100),
    views_count VARCHAR(50), -- e.g., "1.2M"
    video_url TEXT NOT NULL,
    thumbnail_url TEXT
);

-- Indexes for performance
CREATE INDEX idx_factories_location ON factories(location);
CREATE INDEX idx_quote_requests_user ON quote_requests(user_id);
CREATE INDEX idx_orders_factory ON orders(factory_id);
CREATE INDEX idx_order_tasks_order ON order_tasks(order_id);