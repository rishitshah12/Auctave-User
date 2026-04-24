-- Add source_quote_id to crm_orders to link CRM orders back to their originating quote
ALTER TABLE crm_orders ADD COLUMN IF NOT EXISTS source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_orders_source_quote_id ON crm_orders(source_quote_id);
