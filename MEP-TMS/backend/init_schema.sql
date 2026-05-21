-- ============================================================
-- MEP-TMS Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'COORDINATOR', 'TRAINER', 'TRAINEE')),
    phone       VARCHAR(20),
    assigned_batches TEXT[] DEFAULT '{}',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============ BATCHES ============
CREATE TABLE IF NOT EXISTS batches (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id         VARCHAR(50) UNIQUE NOT NULL,
    batch_name       VARCHAR(255) NOT NULL,
    start_date       TIMESTAMPTZ NOT NULL,
    end_date         TIMESTAMPTZ NOT NULL,
    trainers         TEXT[] DEFAULT '{}',
    description      TEXT,
    status           VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'RUNNING', 'COMPLETED', 'CLOSED')),
    candidates_count INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CANDIDATES ============
CREATE TABLE IF NOT EXISTS candidates (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                VARCHAR(255) NOT NULL,
    full_name            VARCHAR(255) NOT NULL,
    registration_number  VARCHAR(50) UNIQUE NOT NULL,
    batch_id             UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    phone                VARCHAR(20),
    performance_score    FLOAT DEFAULT 0,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ATTENDANCES ============
CREATE TABLE IF NOT EXISTS attendances (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id      UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    date          TIMESTAMPTZ NOT NULL,
    status        VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE')),
    version       INTEGER DEFAULT 1,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ASSESSMENTS ============
CREATE TABLE IF NOT EXISTS assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255) NOT NULL,
    total_score     INTEGER NOT NULL,
    obtained_score  INTEGER NOT NULL,
    percentage      FLOAT DEFAULT 0,
    result          VARCHAR(20) DEFAULT 'PENDING' CHECK (result IN ('PASS', 'FAIL', 'PENDING')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============ FEEDBACKS ============
CREATE TABLE IF NOT EXISTS feedbacks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id      UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments      TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type          VARCHAR(50) NOT NULL,
    message       TEXT NOT NULL,
    recipient_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    is_read       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_batches_batch_id ON batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_candidates_batch_id ON candidates(batch_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_attendances_batch_id ON attendances(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendances_candidate_id ON attendances(candidate_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_assessments_batch_id ON assessments(batch_id);
CREATE INDEX IF NOT EXISTS idx_assessments_candidate_id ON assessments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_batch_id ON feedbacks(batch_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_candidate_id ON feedbacks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);

-- ============ AUTO-UPDATE updated_at TRIGGER ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
