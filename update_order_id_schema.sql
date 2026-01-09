-- Update crm_orders table to support custom text IDs instead of UUIDs
ALTER TABLE crm_orders ALTER COLUMN id TYPE text;
ALTER TABLE crm_orders ALTER COLUMN id DROP DEFAULT;