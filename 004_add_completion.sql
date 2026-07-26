-- =====================================================================
-- 004 — Completion tracking
-- Run this in the Supabase SQL Editor after 003_add_reminders.sql.
-- =====================================================================

alter table bookings
  add column completed_at timestamptz,
  add column completed_by uuid references profiles(id);

-- completed_by stays null when the auto-complete job sets it (a system
-- process, not a staff member) — distinguishes "staff confirmed this
-- happened" from "nobody ever touched it and time just passed."