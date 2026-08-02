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
