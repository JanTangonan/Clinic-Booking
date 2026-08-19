## Authentication & Access Control
Staff/admin login only — no client-facing accounts (matches your phone/in-person booking model)
Role-based access enforced three times independently: middleware, page layouts, and database RLS policies
Admin can create staff accounts (temp password shown once) and promote to admin role

## Client Management
Add, view, search, and edit client records (name, phone, email, notes)
Client detail page shows booking history and treatment notes in one place

## Booking System
Staff creates bookings on a client's behalf — service, staff member, date/time
Real-time availability checking based on actual staff shifts for that date
Double-booking physically prevented at the database level (Postgres exclusion constraint), not just in the UI
Cancel with a required reason (categorized, for reporting) — separate "no-show" tracking
Mark complete manually, plus an automatic catch-up job for anything staff forgot
Reschedule moves the same booking to a new time (keeps linked payments/notes intact — doesn't cancel-and-recreate)

## Staff Scheduling
Per-date shifts (not a fixed weekly pattern) — admin sets each staff member's hours for each specific day
Month-view calendar showing who's working when, grouped by shift and color-coded
Day-view operational calendar (one column per staff member on duty that day), printable/exportable to PDF via the browser

## Payments
Manual payment ledger — staff records cash/card/GCash/bank transfer payments against a booking
Auto-computed status (Unpaid / Deposit paid / Fully paid) — never manually toggled, so it can't drift from reality
Overpayment blocked both in the UI and at the server level

## Treatment Notes
Text-based clinical notes per client, optionally linked to a specific booking

## Admin Tools
Manage services (name, price, duration, deposit amount)
Manage staff accounts, specialties, active status
Staff schedule management (see above)

## Reports
Revenue, cancellations-by-reason, and staff performance, filterable by date range
Export to Excel (.xlsx) and PDF

## Reminders (built, not active)
SMS reminder logic wired up via Twilio, paused since you're not paying to test it yet
Email reminders scaffolded but disabled

## Infrastructure
Timezone-safe date handling throughout (Asia/Manila) — fixed a real bug earlier where date math silently drifted a day
Full Supabase schema with row-level security on every table