-- =====================================================================
-- 002 — Cancellation reasons for reporting
-- Run this in the Supabase SQL Editor after 001_init_schema_v2.sql.
-- =====================================================================

-- Fixed set of reasons rather than free text, so reporting later is a
-- simple GROUP BY instead of parsing inconsistent staff-written notes.
create type cancellation_reason as enum (
  'client_request',
  'rescheduled',
  'staff_unavailable',
  'clinic_closed',
  'no_show',
  'other'
);

alter table bookings
  add column cancellation_reason cancellation_reason,
  add column cancellation_note text,      -- optional free-text elaboration, esp. for 'other'
  add column cancelled_by uuid references profiles(id),
  add column cancelled_at timestamptz;

-- Data integrity: you can't have a reason without being cancelled/no_show,
-- and you can't BE cancelled/no_show without a reason. Catches bugs in
-- the app code before they produce unreportable data.
alter table bookings
  add constraint cancellation_reason_matches_status
  check (
    (status in ('cancelled', 'no_show') and cancellation_reason is not null)
    or
    (status not in ('cancelled', 'no_show') and cancellation_reason is null)
  );

-- Speeds up reporting queries like "cancellations by reason this month"
create index idx_bookings_status_cancelled_at on bookings(status, cancelled_at);