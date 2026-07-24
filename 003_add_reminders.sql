-- =====================================================================
-- 003 — Reminder tracking
-- Run this in the Supabase SQL Editor after 002_add_cancellation.sql.
-- =====================================================================

alter table bookings
  add column reminder_sent_at timestamptz;

-- Speeds up the reminder job's query: "bookings starting soon that
-- haven't been reminded yet."
create index idx_bookings_reminder_lookup on bookings(start_time)
  where reminder_sent_at is null;