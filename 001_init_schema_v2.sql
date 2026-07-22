-- =====================================================================
-- Facial Clinic Booking System — Schema + RLS (v2: staff-managed model)
-- =====================================================================
-- Model: only staff/admin have login accounts. Clients are records
-- staff creates and manages directly — no client-facing auth at all.
-- =====================================================================

create extension if not exists btree_gist;

-- =====================================================================
-- 1. ENUMS
-- =====================================================================

create type user_role as enum ('staff', 'admin');
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

-- =====================================================================
-- 2. PROFILES
-- Only staff/admin ever get a row here — this table now maps 1:1 with
-- auth.users for internal accounts only.
-- =====================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- New signups default to 'staff'. In practice you'll create staff
-- accounts yourself (invite flow) rather than open public signup —
-- there's no reason for this app to have a public /signup page anymore.
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Staff'), 'staff');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- 3. STAFF DETAILS
-- =====================================================================

create table staff_details (
  id uuid primary key references profiles(id) on delete cascade,
  specialties text[] default '{}',
  working_hours jsonb not null default '{}',
  active boolean not null default true
);

-- =====================================================================
-- 4. CLIENTS
-- Plain records, NOT linked to auth.users. Staff creates these
-- directly — this is the table that replaces "client profiles."
-- =====================================================================

create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  notes text, -- general notes, not clinical (clinical notes live in treatment_logs)
  created_by uuid references profiles(id), -- which staff member added them
  created_at timestamptz not null default now()
);

create index idx_clients_name on clients(full_name);
create index idx_clients_phone on clients(phone);

-- =====================================================================
-- 5. SERVICES
-- =====================================================================

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price numeric(10,2) not null check (price >= 0),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 6. BOOKINGS
-- client_id now points to `clients`, not `profiles`. Every booking is
-- created by a staff member — created_by tracks who entered it.
-- =====================================================================

create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  staff_id uuid not null references staff_details(id),
  service_id uuid not null references services(id),
  created_by uuid not null references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  deposit_paid boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),

  check (end_time > start_time),

  during tstzrange generated always as (tstzrange(start_time, end_time, '[)')) stored,

  -- Same double-booking guard as before — still enforced at the DB
  -- level regardless of who's creating the booking.
  exclude using gist (
    staff_id with =,
    during with &&
  ) where (status in ('pending', 'confirmed', 'completed'))
);

create index idx_bookings_client on bookings(client_id);
create index idx_bookings_staff_time on bookings(staff_id, start_time);

-- =====================================================================
-- 7. TREATMENT LOGS
-- =====================================================================

create table treatment_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  booking_id uuid references bookings(id),
  staff_id uuid not null references profiles(id),
  notes text,
  photo_urls text[] default '{}',
  created_at timestamptz not null default now()
);

create index idx_treatment_logs_client on treatment_logs(client_id);

-- =====================================================================
-- 8. PAYMENTS
-- Staff can now record payments directly (cash/card taken in-clinic),
-- in addition to Stripe webhook writes for remote deposit links.
-- =====================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  amount numeric(10,2) not null,
  method text not null default 'in_person', -- 'in_person' | 'stripe'
  stripe_payment_intent_id text unique,
  status payment_status not null default 'pending',
  recorded_by uuid references profiles(id), -- null if written by webhook
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 9. AUDIT LOG
-- =====================================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 10. HELPER FUNCTION FOR RLS
-- =====================================================================

create function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- =====================================================================
-- 11. ENABLE RLS
-- =====================================================================

alter table profiles enable row level security;
alter table staff_details enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table treatment_logs enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

-- =====================================================================
-- 12. POLICIES
-- Much simpler now: almost everything is "any logged-in staff/admin
-- can read and write," with admin-only carve-outs for destructive or
-- sensitive actions (deleting clinical notes, managing staff accounts,
-- changing prices). There is no client-facing role to isolate against.
-- =====================================================================

-- PROFILES — staff can see each other (for assigning bookings), only
-- admin can edit roles / manage accounts
create policy "profiles_select_all_staff" on profiles
  for select using (current_user_role() in ('staff', 'admin'));

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy "profiles_admin_all" on profiles
  for all using (current_user_role() = 'admin');

-- STAFF DETAILS
create policy "staff_select_all" on staff_details
  for select using (current_user_role() in ('staff', 'admin'));

create policy "staff_admin_all" on staff_details
  for all using (current_user_role() = 'admin');

-- CLIENTS — any staff can create/view/update; only admin deletes
create policy "clients_select_staff" on clients
  for select using (current_user_role() in ('staff', 'admin'));

create policy "clients_insert_staff" on clients
  for insert with check (current_user_role() in ('staff', 'admin'));

create policy "clients_update_staff" on clients
  for update using (current_user_role() in ('staff', 'admin'));

create policy "clients_delete_admin" on clients
  for delete using (current_user_role() = 'admin');

-- SERVICES — staff read, admin manages pricing/catalog
create policy "services_select_staff" on services
  for select using (current_user_role() in ('staff', 'admin'));

create policy "services_admin_all" on services
  for all using (current_user_role() = 'admin');

-- BOOKINGS — any staff can create/view/update; deletion admin-only
-- (cancel via status change instead of hard delete, in practice)
create policy "bookings_select_staff" on bookings
  for select using (current_user_role() in ('staff', 'admin'));

create policy "bookings_insert_staff" on bookings
  for insert with check (current_user_role() in ('staff', 'admin'));

create policy "bookings_update_staff" on bookings
  for update using (current_user_role() in ('staff', 'admin'));

create policy "bookings_delete_admin" on bookings
  for delete using (current_user_role() = 'admin');

-- TREATMENT LOGS — staff read/write, only admin edits/deletes after
-- the fact (keeps clinical notes tamper-resistant post-entry)
create policy "logs_select_staff" on treatment_logs
  for select using (current_user_role() in ('staff', 'admin'));

create policy "logs_insert_staff" on treatment_logs
  for insert with check (current_user_role() in ('staff', 'admin'));

create policy "logs_update_admin" on treatment_logs
  for update using (current_user_role() = 'admin');

create policy "logs_delete_admin" on treatment_logs
  for delete using (current_user_role() = 'admin');

-- PAYMENTS — staff can record in-person payments; admin sees/edits all
create policy "payments_select_staff" on payments
  for select using (current_user_role() in ('staff', 'admin'));

create policy "payments_insert_staff" on payments
  for insert with check (current_user_role() in ('staff', 'admin'));

create policy "payments_update_admin" on payments
  for update using (current_user_role() = 'admin');

-- AUDIT LOG — admin only
create policy "audit_select_admin" on audit_log
  for select using (current_user_role() = 'admin');
