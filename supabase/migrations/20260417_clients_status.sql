-- Add status column to clients table for account suspension
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Index for fast filtering by status
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);
