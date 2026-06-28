-- Migration 010: Remote-control columns and RPCs for screens
--
-- These columns and functions were originally added via the Supabase Dashboard.
-- This migration documents them so a fresh `db push` preserves them.
-- All statements use IF NOT EXISTS / CREATE OR REPLACE so the migration is
-- idempotent on the current live database.

-- ── Columns ─────────────────────────────────────────────────────────────────

ALTER TABLE screens ADD COLUMN IF NOT EXISTS last_heartbeat  TIMESTAMPTZ;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS pending_command TEXT;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS power_state     TEXT NOT NULL DEFAULT 'on';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS app_info        TEXT;

-- ── RPCs ─────────────────────────────────────────────────────────────────────

-- screen_poll: Called by the Raspberry Pi kiosk on every heartbeat (~30 s).
-- Updates last_seen_at, last_heartbeat, status, and app_info, then returns
-- the current power_state and any pending command so the kiosk can react.
CREATE OR REPLACE FUNCTION public.screen_poll(
  p_token TEXT,
  p_info  TEXT DEFAULT NULL
)
RETURNS TABLE(power_state TEXT, pending_command TEXT, screen_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE screens s
     SET last_seen_at   = now(),
         last_heartbeat = now(),
         status         = 'active',
         app_info       = COALESCE(p_info, s.app_info)
   WHERE s.token = p_token;

  RETURN QUERY
    SELECT s.power_state, s.pending_command, s.name
      FROM screens s
     WHERE s.token = p_token;
END;
$$;

-- screen_ack: Called by the kiosk after executing a command.
-- Clears pending_command and updates power_state for power-related commands.
CREATE OR REPLACE FUNCTION public.screen_ack(
  p_token   TEXT,
  p_command TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE screens
     SET pending_command = NULL,
         power_state = CASE
           WHEN p_command = 'power_off' THEN 'off'
           WHEN p_command = 'power_on'  THEN 'on'
           ELSE power_state
         END
   WHERE token = p_token AND pending_command = p_command;
END;
$$;
