import { createClient } from "@/lib/supabase/server";
import { todayInClinicTZ } from "@/lib/date";

function firstOfMonth(): string {
  const [y, m] = todayInClinicTZ().split("-");
  return `${y}-${m}-01`;
}

function formatDateLabel(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  const [{ data: revenue, error: revenueErr }, { data: cancellations, error: cancelErr }, { data: staffStats, error: staffErr }] =
    await Promise.all([
      supabase.rpc("report_revenue", { p_start: from, p_end: to }) as unknown as Promise<{ data: RevenueRow[] | null; error: { message: string } | null }>,
      supabase.rpc("report_cancellations", { p_start: from, p_end: to }) as unknown as Promise<{ data: CancellationRow[] | null; error: { message: string } | null }>,
      supabase.rpc("report_staff_performance", { p_start: from, p_end: to }) as unknown as Promise<{ data: StaffRow[] | null; error: { message: string } | null }>,
    ]);

  const totalRevenue = (revenue || []).reduce((sum, r) => sum + Number(r.total), 0);
  const totalCancellations = (cancellations || []).reduce((sum, c) => sum + Number(c.count), 0);
  const paymentMethods = revenue?.length ?? 0;
  const periodLabel = from === to ? formatDateLabel(from) : `${formatDateLabel(from)} – ${formatDateLabel(to)}`;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex gap-2">
          <a
            href={`/api/reports/export/xlsx?from=${from}&to=${to}`}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Export Excel
          </a>
          <a
            href={`/api/reports/export/pdf?from=${from}&to=${to}`}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Export PDF
          </a>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Performance overview</p>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review revenue, cancellations, and team productivity for {periodLabel}.
          </p>
        </div>

        <form method="get" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0"
            />
          </div>
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Apply
          </button>
        </form>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total revenue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">₱{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Cancellations &amp; no-shows</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalCancellations}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Payment methods</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{paymentMethods}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revenue breakdown</h2>
              <p className="text-sm text-slate-500">Payments by method during this period.</p>
            </div>
          </div>
          {revenueErr && <p className="text-sm text-red-600">{revenueErr.message}</p>}
          {revenue && revenue.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium text-right">Payments</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((r) => (
                    <tr key={r.method} className="border-t border-slate-200 bg-white">
                      <td className="px-3 py-2 capitalize text-slate-700">{r.method.replace("_", " ")}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{r.payment_count}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">₱{Number(r.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No payments recorded in this period.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Cancellations &amp; no-shows</h2>
            <p className="text-sm text-slate-500">A quick view of why bookings were lost.</p>
          </div>
          {cancelErr && <p className="text-sm text-red-600">{cancelErr.message}</p>}
          {cancellations && cancellations.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Reason</th>
                    <th className="px-3 py-2 font-medium text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellations.map((c) => (
                    <tr key={c.reason} className="border-t border-slate-200 bg-white">
                      <td className="px-3 py-2 capitalize text-slate-700">{c.reason.replace("_", " ")}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No cancellations in this period.
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Staff performance</h2>
          <p className="text-sm text-slate-500">Track completion rates, cancellations, and revenue contribution by staff.</p>
        </div>
        {staffErr && <p className="text-sm text-red-600">{staffErr.message}</p>}
        {staffStats && staffStats.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Staff</th>
                  <th className="px-3 py-2 font-medium text-right">Completed</th>
                  <th className="px-3 py-2 font-medium text-right">Cancelled</th>
                  <th className="px-3 py-2 font-medium text-right">No-shows</th>
                  <th className="px-3 py-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map((s) => (
                  <tr key={s.staff_id} className="border-t border-slate-200 bg-white">
                    <td className="px-3 py-2 font-medium text-slate-900">{s.staff_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{s.completed_count}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{s.cancelled_count}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{s.no_show_count}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900">₱{Number(s.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No staff activity in this period.
          </div>
        )}
      </section>
    </div>
  );
}
