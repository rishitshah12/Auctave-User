-- Layer 1 Integration: Trust Tiers + Risk Scoring
-- Run this in the Supabase SQL editor

-- factories: trust tier + performance metrics
ALTER TABLE factories
  ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS completed_orders_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_time_delivery_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS quality_rejection_rate NUMERIC(5,2);

-- crm_orders: risk scoring + delivery date
ALTER TABLE crm_orders
  ADD COLUMN IF NOT EXISTS risk_score TEXT DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS risk_score_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_date DATE;