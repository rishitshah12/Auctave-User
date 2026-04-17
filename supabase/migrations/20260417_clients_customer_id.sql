-- Add customer_id column to clients table for unique human-readable IDs
ALTER TABLE clients ADD COLUMN IF NOT EXISTS customer_id text;

-- Add a unique constraint so no two clients share a customer_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_customer_id_unique'
    ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_customer_id_unique UNIQUE (customer_id);
    END IF;
END$$;
