import { createClient } from "@/lib/supabase/server";
import { todayInClinicTZ } from "@/lib/date";

function firstOfMonth(): string {
  const [y, m] = todayInClinicTZ().split("-");
  return `${y}-${m}-01`;
}

type RevenueRow = { method: string; total: number; payment_count: number };
type CancellationRow = { reason: string; count: number };
type StaffRow = {
  staff_id: string;
  staff_name: string;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  revenue: number;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam || firstOfMonth();
  const to = toParam || todayInClinicTZ();

  const supabase = await createClient();

  // Three independent RPC calls, run in parallel — each does its own
  // aggregation inside Postgres rather than pulling raw rows here.
  const [{ data: revenue, error: revenueErr }, { data: cancellations, error: cancelErr }, { data: staffStats, error: staffErr }] =
    await Promise.all([
      supabase.rpc("report_revenue", { p_start: from, p_end: to }) as unknown as Promise<{ data: RevenueRow[] | null; error: { message: string } | null }>,
      supabase.rpc("report_cancellations", { p_start: from, p_end: to }) as unknown as Promise<{ data: CancellationRow[] | null; error: { message: string } | null }>,
      supabase.rpc("report_staff_performance", { p_start: from, p_end: to }) as unknown as Promise<{ data: StaffRow[] | null; error: { message: string } | null }>,
    ]);

  const totalRevenue = (revenue || []).reduce((sum, r) => sum + Number(r.total), 0);
  const totalCancellations = (cancellations || []).reduce((sum, c) => sum + Number(c.count), 0);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Reports</h1>

      {/* Plain GET form — no JS needed, the browser just navigates
          with ?from=...&to=... which the server component re-reads. */}
      <form method="get" className="flex items-end gap-3 mb-8">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded bg-black px-4 py-1.5 text-sm text-white">
          Apply
        </button>
      </form>

      {/* Revenue */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3">Revenue</h2>
        {revenueErr && <p className="text-sm text-red-600">{revenueErr.message}</p>}
        <p className="text-3xl font-semibold mb-3">₱{totalRevenue.toLocaleString()}</p>
        {revenue && revenue.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 font-normal">Method</th>
                <th className="py-1 font-normal text-right">Payments</th>
                <th className="py-1 font-normal text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((r) => (
                <tr key={r.method} className="border-b border-gray-100">
                  <td className="py-1.5 capitalize">{r.method.replace("_", " ")}</td>
                  <td className="py-1.5 text-right">{r.payment_count}</td>
                  <td className="py-1.5 text-right">₱{Number(r.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">No payments recorded in this period.</p>
        )}
      </section>

      {/* Cancellations */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3">Cancellations &amp; no-shows</h2>
        {cancelErr && <p className="text-sm text-red-600">{cancelErr.message}</p>}
        <p className="text-3xl font-semibold mb-3">{totalCancellations}</p>
        {cancellations && cancellations.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 font-normal">Reason</th>
                <th className="py-1 font-normal text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {cancellations.map((c) => (
                <tr key={c.reason} className="border-b border-gray-100">
                  <td className="py-1.5 capitalize">{c.reason.replace("_", " ")}</td>
                  <td className="py-1.5 text-right">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">No cancellations in this period.</p>
        )}
      </section>

      {/* Staff performance */}
      <section>
        <h2 className="text-lg font-medium mb-3">Staff performance</h2>
        {staffErr && <p className="text-sm text-red-600">{staffErr.message}</p>}
        {staffStats && staffStats.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 font-normal">Staff</th>
                <th className="py-1 font-normal text-right">Completed</th>
                <th className="py-1 font-normal text-right">Cancelled</th>
                <th className="py-1 font-normal text-right">No-shows</th>
                <th className="py-1 font-normal text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {staffStats.map((s) => (
                <tr key={s.staff_id} className="border-b border-gray-100">
                  <td className="py-1.5">{s.staff_name}</td>
                  <td className="py-1.5 text-right">{s.completed_count}</td>
                  <td className="py-1.5 text-right">{s.cancelled_count}</td>
                  <td className="py-1.5 text-right">{s.no_show_count}</td>
                  <td className="py-1.5 text-right">₱{Number(s.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">No staff activity in this period.</p>
        )}
      </section>
    </div>
  );
}
