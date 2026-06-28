-- Sprint 4: publiseringsstatus
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'live';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'scheduled';

-- Legg til scheduled_at og published_at på content_items
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS scheduled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS published_at  timestamptz;
