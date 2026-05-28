-- ============================================================
-- MEP-TMS Report Cards Schema for Spark, Foundation, & Stream
-- Run this in the Supabase SQL Editor to create these tables.
-- ============================================================

-- ============ SPARK PHASE 1 REPORT CARDS ============
CREATE TABLE IF NOT EXISTS spark_1_report_cards (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id             UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id         UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    superset_id          VARCHAR(50),
    name                 VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    college              VARCHAR(255),
    training_name        VARCHAR(100) DEFAULT 'Spark Phase 1',
    training_start_date  VARCHAR(50),
    training_end_date    VARCHAR(50),
    trainer_name         VARCHAR(255),
    batch_no             VARCHAR(100),
    training_status      VARCHAR(50) DEFAULT 'Active',
    a1_score             FLOAT,
    a2_score             FLOAT,
    communication_skills FLOAT,
    interpersonal_skills FLOAT,
    business_etiquette   FLOAT,
    service_orientation  FLOAT,
    emotional_intelligence_empathy FLOAT,
    accountability_ownership FLOAT,
    presentation_skills  FLOAT,
    final_status         VARCHAR(50) DEFAULT 'Not Cleared',
    rank                 INTEGER,
    reevaluation_comments TEXT,
    total_days           INTEGER DEFAULT 0,
    present_days         INTEGER DEFAULT 0,
    absent_days          INTEGER DEFAULT 0,
    attendance_percentage FLOAT DEFAULT 0.0,
    reason_for_absence   TEXT,
    pc_name              VARCHAR(255),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SPARK PHASE 2 REPORT CARDS ============
CREATE TABLE IF NOT EXISTS spark_2_report_cards (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id             UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id         UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    superset_id          VARCHAR(50),
    name                 VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    college              VARCHAR(255),
    training_name        VARCHAR(100) DEFAULT 'Spark Phase 2',
    training_start_date  VARCHAR(50),
    training_end_date    VARCHAR(50),
    trainer_name         VARCHAR(255),
    batch_no             VARCHAR(100),
    training_status      VARCHAR(50) DEFAULT 'Active',
    a1_score             FLOAT,
    a2_score             FLOAT,
    communication_skills FLOAT,
    interpersonal_skills FLOAT,
    business_etiquette   FLOAT,
    service_orientation  FLOAT,
    emotional_intelligence_empathy FLOAT,
    accountability_ownership FLOAT,
    presentation_skills  FLOAT,
    final_status         VARCHAR(50) DEFAULT 'Not Cleared',
    rank                 INTEGER,
    reevaluation_comments TEXT,
    total_days           INTEGER DEFAULT 0,
    present_days         INTEGER DEFAULT 0,
    absent_days          INTEGER DEFAULT 0,
    attendance_percentage FLOAT DEFAULT 0.0,
    reason_for_absence   TEXT,
    pc_name              VARCHAR(255),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============ FOUNDATIONAL TRAINING REPORT CARDS ============
CREATE TABLE IF NOT EXISTS foundation_report_cards (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id             UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id         UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    superset_id          VARCHAR(50),
    name                 VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    college              VARCHAR(255),
    contact_number       VARCHAR(50),
    foundation_language  VARCHAR(100),
    status               VARCHAR(50) DEFAULT 'Active',
    email_sent_date      TIMESTAMPTZ,
    reason               TEXT,
    ga1_a1               FLOAT,
    ga1_a2               FLOAT,
    ga2_a1               FLOAT,
    ga2_a2               FLOAT,
    ga3_a1               FLOAT,
    ga3_a2               FLOAT,
    ga4_a1               FLOAT,
    ga4_a2               FLOAT,
    ga5_a1               FLOAT,
    ga5_a2               FLOAT,
    project_eval_a1      FLOAT,
    project_eval_a2      FLOAT,
    final_grade_a1       FLOAT,
    final_grade_a2       FLOAT,
    training_status      VARCHAR(50) DEFAULT 'Active',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============ STREAM BASED TRAINING REPORT CARDS ============
CREATE TABLE IF NOT EXISTS stream_report_cards (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id             UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    candidate_id         UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    doj                  TIMESTAMPTZ,
    superset_id          VARCHAR(50),
    emp_id               VARCHAR(50),
    name                 VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    college              VARCHAR(255),
    foundation_language  VARCHAR(100),
    stream_training      VARCHAR(255),
    training_start_date  VARCHAR(50),
    training_end_date    VARCHAR(50),
    trainer_name         VARCHAR(255),
    batch_no             VARCHAR(100),
    training_status      VARCHAR(50) DEFAULT 'Active',
    -- MCQ-1 to MCQ-7
    mcq1_a1              FLOAT,
    mcq1_a2              FLOAT,
    mcq2_a1              FLOAT,
    mcq2_a2              FLOAT,
    mcq3_a1              FLOAT,
    mcq3_a2              FLOAT,
    mcq4_a1              FLOAT,
    mcq4_a2              FLOAT,
    mcq5_a1              FLOAT,
    mcq5_a2              FLOAT,
    mcq6_a1              FLOAT,
    mcq6_a2              FLOAT,
    mcq7_a1              FLOAT,
    mcq7_a2              FLOAT,
    -- Coding-1 to Coding-7
    coding1_a1           FLOAT,
    coding1_a2           FLOAT,
    coding2_a1           FLOAT,
    coding2_a2           FLOAT,
    coding3_a1           FLOAT,
    coding3_a2           FLOAT,
    coding4_a1           FLOAT,
    coding4_a2           FLOAT,
    coding5_a1           FLOAT,
    coding5_a2           FLOAT,
    coding6_a1           FLOAT,
    coding6_a2           FLOAT,
    coding7_a1           FLOAT,
    coding7_a2           FLOAT,
    -- Projects
    project_score1_a1    FLOAT,
    project_score1_a2    FLOAT,
    project_score2_a1    FLOAT,
    project_score2_a2    FLOAT,
    -- Online Coding
    online_coding_a1     FLOAT,
    online_coding_a2     FLOAT,
    final_status         VARCHAR(50) DEFAULT 'Cleared',
    comment_reason       TEXT,
    total_days           INTEGER DEFAULT 0,
    present_days         INTEGER DEFAULT 0,
    absent_days          INTEGER DEFAULT 0,
    attendance_percentage FLOAT DEFAULT 0.0,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_spark1_batch ON spark_1_report_cards(batch_id);
CREATE INDEX IF NOT EXISTS idx_spark1_cand ON spark_1_report_cards(candidate_id);
CREATE INDEX IF NOT EXISTS idx_spark1_email ON spark_1_report_cards(email);

CREATE INDEX IF NOT EXISTS idx_spark2_batch ON spark_2_report_cards(batch_id);
CREATE INDEX IF NOT EXISTS idx_spark2_cand ON spark_2_report_cards(candidate_id);
CREATE INDEX IF NOT EXISTS idx_spark2_email ON spark_2_report_cards(email);

CREATE INDEX IF NOT EXISTS idx_foundation_batch ON foundation_report_cards(batch_id);
CREATE INDEX IF NOT EXISTS idx_foundation_cand ON foundation_report_cards(candidate_id);
CREATE INDEX IF NOT EXISTS idx_foundation_email ON foundation_report_cards(email);

CREATE INDEX IF NOT EXISTS idx_stream_batch ON stream_report_cards(batch_id);
CREATE INDEX IF NOT EXISTS idx_stream_cand ON stream_report_cards(candidate_id);
CREATE INDEX IF NOT EXISTS idx_stream_email ON stream_report_cards(email);

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_spark_1_updated_at BEFORE UPDATE ON spark_1_report_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spark_2_updated_at BEFORE UPDATE ON spark_2_report_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foundation_updated_at BEFORE UPDATE ON foundation_report_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stream_updated_at BEFORE UPDATE ON stream_report_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration to add Spark Phase 1 & 2 redesigned report card fields
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS communication_skills FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS interpersonal_skills FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS business_etiquette FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS service_orientation FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS emotional_intelligence_empathy FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS accountability_ownership FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS presentation_skills FLOAT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS reevaluation_comments TEXT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS reason_for_absence TEXT;
ALTER TABLE spark_1_report_cards ADD COLUMN IF NOT EXISTS pc_name VARCHAR(255);
ALTER TABLE spark_1_report_cards ALTER COLUMN final_status SET DEFAULT 'Not Cleared';

ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS communication_skills FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS interpersonal_skills FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS business_etiquette FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS service_orientation FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS emotional_intelligence_empathy FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS accountability_ownership FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS presentation_skills FLOAT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS reevaluation_comments TEXT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS reason_for_absence TEXT;
ALTER TABLE spark_2_report_cards ADD COLUMN IF NOT EXISTS pc_name VARCHAR(255);
ALTER TABLE spark_2_report_cards ALTER COLUMN final_status SET DEFAULT 'Not Cleared';

