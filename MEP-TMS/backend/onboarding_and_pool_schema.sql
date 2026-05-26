-- ============================================================
-- MEP-TMS Onboarding & Trainee Pool Schema Migration
-- Run this in the Supabase SQL Editor to apply these changes.
-- ============================================================

-- 1. Alter batches table to add category, phase, and onboarding_date
ALTER TABLE batches ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SPARK';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS phase VARCHAR(50);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS onboarding_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Create trainee_pool table for date-basis onboarding
CREATE TABLE IF NOT EXISTS trainee_pool (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                VARCHAR(255) NOT NULL,
    full_name            VARCHAR(255) NOT NULL,
    college              VARCHAR(255),
    phone                VARCHAR(20),
    onboarding_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    status               VARCHAR(50) DEFAULT 'UNASSIGNED' CHECK (status IN ('UNASSIGNED', 'SPARK_1', 'SPARK_2', 'FOUNDATION', 'STREAM', 'ELIMINATED', 'COMPLETED')),
    current_batch_id     UUID REFERENCES batches(id) ON DELETE SET NULL,
    foundation_language  VARCHAR(100),
    stream_training      VARCHAR(100),
    eliminated_phase     VARCHAR(50),
    registration_number  VARCHAR(50) UNIQUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    -- Trainees onboarded on a specific date must have unique emails in that pool
    CONSTRAINT unique_email_per_onboarding_date UNIQUE (email, onboarding_date)
);

-- Disable Row Level Security (RLS) on trainee_pool for client insertions
ALTER TABLE trainee_pool DISABLE ROW LEVEL SECURITY;

-- 3. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_trainee_pool_onboarding_date ON trainee_pool(onboarding_date);
CREATE INDEX IF NOT EXISTS idx_trainee_pool_status ON trainee_pool(status);
CREATE INDEX IF NOT EXISTS idx_trainee_pool_email ON trainee_pool(email);

-- 4. Set up auto-update trigger for updated_at
CREATE TRIGGER update_trainee_pool_updated_at BEFORE UPDATE ON trainee_pool
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
