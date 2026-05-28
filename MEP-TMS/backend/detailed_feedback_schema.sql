-- ============================================================
-- Detailed Feedback Table
-- Stores full Microsoft Forms-style feedback responses.
-- Run this once against your Supabase / PostgreSQL database.
-- ============================================================

CREATE TABLE IF NOT EXISTS detailed_feedbacks (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                        UUID        NOT NULL,
    candidate_id                    UUID,
    respondent_name                 TEXT,
    respondent_email                TEXT,
    batch_no_and_trainer            TEXT,
    takeaway1                       TEXT,
    takeaway2                       TEXT,
    takeaway3                       TEXT,
    improvements                    TEXT,
    course_impact                   TEXT,
    trainer_rating                  SMALLINT    NOT NULL CHECK (trainer_rating BETWEEN 1 AND 5),
    assignments_helpful             TEXT,       -- 'Yes' | 'No' | 'Partially'
    demonstrations_helpful          TEXT,
    trainer_support_adequate        TEXT,
    technical_discussions_helpful   TEXT,
    other_comments                  TEXT,
    submitted_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detailed_feedbacks_batch_id
    ON detailed_feedbacks (batch_id);

CREATE INDEX IF NOT EXISTS idx_detailed_feedbacks_submitted_at
    ON detailed_feedbacks (submitted_at);

COMMENT ON TABLE detailed_feedbacks IS
    'Stores full training feedback form responses (one row per trainee per batch).';
