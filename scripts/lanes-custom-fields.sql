-- Additive and idempotent. Apply deliberately to the configured database.
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- Existing (board_id, key) unique index intentionally includes deleted rows.
