-- ============================================================
-- Attendance Audit Log Table
-- Stores a versioned history of every attendance status change.
-- Run this once against your Supabase / PostgreSQL database.
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id   UUID        NOT NULL,          -- FK to attendances.id
    old_status      TEXT        NOT NULL,          -- PRESENT | ABSENT | LEAVE
    new_status      TEXT        NOT NULL,          -- PRESENT | ABSENT | LEAVE
    changed_by      TEXT        NOT NULL,          -- email of the user who made the change
    changed_by_role TEXT        NOT NULL,          -- TRAINER | COORDINATOR | ADMIN | TRAINEE
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by attendance record
CREATE INDEX IF NOT EXISTS idx_audit_attendance_id
    ON attendance_audit_logs (attendance_id);

-- Index for auditing by actor
CREATE INDEX IF NOT EXISTS idx_audit_changed_by
    ON attendance_audit_logs (changed_by);

-- Optional: foreign key constraint (enable if attendances table uses UUID PK)
-- ALTER TABLE attendance_audit_logs
--     ADD CONSTRAINT fk_audit_attendance
--     FOREIGN KEY (attendance_id) REFERENCES attendances(id) ON DELETE CASCADE;

COMMENT ON TABLE attendance_audit_logs IS
    'Immutable audit trail for every attendance status change. '
    'Each row captures the before/after state, who changed it, and when.';
