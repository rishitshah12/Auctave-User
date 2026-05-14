-- Add shipping / tracking fields to crm_orders
ALTER TABLE crm_orders
  ADD COLUMN IF NOT EXISTS tracking_number    TEXT,
  ADD COLUMN IF NOT EXISTS container_number   TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier   TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at  JSONB DEFAULT '{}';

-- Trigger function: auto-stamp timestamp whenever status changes
CREATE OR REPLACE FUNCTION trg_fn_record_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS NOT NULL THEN
    NEW.status_changed_at :=
      COALESCE(OLD.status_changed_at, '{}'::jsonb) ||
      jsonb_build_object(NEW.status, now()::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_order_status_change ON crm_orders;
CREATE TRIGGER trg_record_order_status_change
  BEFORE UPDATE ON crm_orders
  FOR EACH ROW EXECUTE FUNCTION trg_fn_record_order_status_change();

-- Back-fill: stamp current status with created_at for existing rows
UPDATE crm_orders
SET status_changed_at = jsonb_build_object(status, created_at::text)
WHERE status IS NOT NULL
  AND (status_changed_at IS NULL OR status_changed_at = '{}'::jsonb);
