-- Add customer_id column to clients table for unique human-readable IDs
ALTER TABLE clients ADD COLUMN IF NOT EXISTS customer_id text;

-- Add a unique constraint so no two clients share a customer_id
ALTER TABLE clients ADD CONSTRAINT IF NOT EXISTS clients_customer_id_unique UNIQUE (customer_id);
