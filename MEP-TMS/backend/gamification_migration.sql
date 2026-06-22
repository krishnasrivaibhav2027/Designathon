-- ============================================================
-- MEP-TMS Gamification (Bits & Bytes) & Permanent Onboarding Migration
-- Run this in your Supabase SQL Editor or database tool to update the schema.
-- ============================================================

-- 1. Update candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bits_accumulated INTEGER DEFAULT 0 CHECK (bits_accumulated >= 0 AND bits_accumulated <= 7);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bytes_total INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_permanent_employee BOOLEAN DEFAULT FALSE;

-- 2. Update trainee_pool table
ALTER TABLE trainee_pool ADD COLUMN IF NOT EXISTS bits_accumulated INTEGER DEFAULT 0 CHECK (bits_accumulated >= 0 AND bits_accumulated <= 7);
ALTER TABLE trainee_pool ADD COLUMN IF NOT EXISTS bytes_total INTEGER DEFAULT 0;
ALTER TABLE trainee_pool ADD COLUMN IF NOT EXISTS is_permanent_employee BOOLEAN DEFAULT FALSE;

-- 3. Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_permanent_employee BOOLEAN DEFAULT FALSE;

-- 4. Create gamification_ledger table to track transaction logs for auditing
CREATE TABLE IF NOT EXISTS gamification_ledger (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL,
    amount_bits   INTEGER NOT NULL,
    reason        VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create index on ledger for quick trainee auditing
CREATE INDEX IF NOT EXISTS idx_gamification_ledger_email ON gamification_ledger(email);
