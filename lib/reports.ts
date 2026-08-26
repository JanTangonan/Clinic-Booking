import { createClient } from "@/lib/supabase/server";

export type RevenueRow = { method: string; total: number; payment_count: number };
export type CancellationRow = { reason: string; count: number };
export type StaffRow = {
  staff_id: string;
  staff_name: string;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  revenue: number;
};

// Shared by the reports page and both export routes so the three RPC
// calls and their typing live in exactly one place — the page, the
// Excel export, and the PDF export all show the same numbers because
// they're all calling this same function, not three separate copies
// of similar-but-maybe-drifting query logic.
export async function getReportData(from: string, to: string) {
  const supabase = await createClient();

  const [
    { data: revenue, error: revenueErr },
    { data: cancellations, error: cancelErr },
    { data: staffStats, error: staffErr },
  ] = await Promise.all([
    supabase.rpc("report_revenue", { p_start: from, p_end: to }) as unknown as Promise<{
      data: RevenueRow[] | null;
      error: { message: string } | null;
    }>,
    supabase.rpc("report_cancellations", { p_start: from, p_end: to }) as unknown as Promise<{
      data: CancellationRow[] | null;
      error: { message: string } | null;
    }>,
    supabase.rpc("report_staff_performance", { p_start: from, p_end: to }) as unknown as Promise<{
      data: StaffRow[] | null;
      error: { message: string } | null;
    }>,
  ]);

  return {
    revenue: revenue || [],
    cancellations: cancellations || [],
    staffStats: staffStats || [],
    errors: { revenueErr, cancelErr, staffErr },
  };
}

const HISTORY_LIMIT = 200;

function dateRangeISO(from: string, to: string) {
  const fromISO = new Date(`${from}T00:00:00`).toISOString();
  const toISO = new Date(new Date(`${to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { fromISO, toISO };
}

export type PaymentHistoryRow = {
  id: string;
  amount: number;
  method: string;
  created_at: string;
  bookings: { clients: { full_name: string } | { full_name: string }[] | null; services: { name: string } | { name: string }[] | null } | null;
  recorded_by: { full_name: string } | { full_name: string }[] | null;
};

// Individual payment records, most recent first — "when did the money
// actually come in," not just totals by method.
export async function getPaymentHistory(from: string, to: string) {
  const supabase = await createClient();
  const { fromISO, toISO } = dateRangeISO(from, to);

  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, amount, method, created_at, bookings(clients(full_name), services(name)), recorded_by:recorded_by(full_name)"
    )
    .eq("status", "paid")
    .gte("created_at", fromISO)
    .lt("created_at", toISO)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  return { data: (data as PaymentHistoryRow[] | null) || [], error };
}

export type RescheduleHistoryRow = {
  id: string;
  created_at: string;
  details: { old_start_time?: string; new_start_time?: string } | null;
  actor: { full_name: string } | { full_name: string }[] | null;
  target_id: string;
  booking?: {
    id: string;
    clients: { full_name: string } | { full_name: string }[] | null;
    services: { name: string } | { name: string }[] | null;
  };
};

// audit_log.target_id is a generic polymorphic reference (not a real
// foreign key — it points at whatever `target_table` says), so
// PostgREST can't embed the booking automatically. Enriched manually
// with a second query instead.
export async function getRescheduleHistory(from: string, to: string) {
  const supabase = await createClient();
  const { fromISO, toISO } = dateRangeISO(from, to);

  const { data, error } = await supabase
    .from("audit_log")
    .select("id, created_at, details, actor:actor_id(full_name), target_id")
    .eq("action", "booking_rescheduled")
    .gte("created_at", fromISO)
    .lt("created_at", toISO)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return { data: [] as RescheduleHistoryRow[], error };

  const bookingIds = [...new Set(data.map((d) => d.target_id))];
  const { data: bookings } = bookingIds.length
    ? await supabase.from("bookings").select("id, clients(full_name), services(name)").in("id", bookingIds)
    : { data: [] };

  const bookingById = new Map((bookings || []).map((b) => [b.id, b]));

  return {
    data: data.map((d) => ({ ...d, booking: bookingById.get(d.target_id) })) as RescheduleHistoryRow[],
    error,
  };
}

export type CancellationListRow = {
  id: string;
  status: string;
  cancellation_reason: string | null;
  cancellation_note: string | null;
  cancelled_at: string | null;
  clients: { full_name: string } | { full_name: string }[] | null;
  services: { name: string } | { name: string }[] | null;
  staff_details: { profiles: { full_name: string } | { full_name: string }[] | null } | { profiles: { full_name: string } | { full_name: string }[] | null }[] | null;
  cancelled_by: { full_name: string } | { full_name: string }[] | null;
};

// Individual cancelled/no-show bookings, most recent first.
export async function getCancellationList(from: string, to: string) {
  const supabase = await createClient();
  const { fromISO, toISO } = dateRangeISO(from, to);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, status, cancellation_reason, cancellation_note, cancelled_at, clients(full_name), services(name), staff_details(profiles(full_name)), cancelled_by:cancelled_by(full_name)"
    )
    .in("status", ["cancelled", "no_show"])
    .gte("cancelled_at", fromISO)
    .lt("cancelled_at", toISO)
    .order("cancelled_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  return { data: (data as CancellationListRow[] | null) || [], error };
}