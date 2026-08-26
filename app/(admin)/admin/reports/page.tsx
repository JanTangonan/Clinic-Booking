import {
  getReportData,
  getPaymentHistory,
  getRescheduleHistory,
  getCancellationList,
} from "@/lib/reports";
import { todayInClinicTZ } from "@/lib/date";

function firstOfMonth(): string {
  const [y, m] = todayInClinicTZ().split("-");
  return `${y}-${m}-01`;
}

function singularize<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam || firstOfMonth();
  const to = toParam || todayInClinicTZ();

  const [
    {
      revenue,
      cancellations,
      staffStats,
      errors: { revenueErr, cancelErr, staffErr },
    },
    { data: paymentHistory, error: paymentHistoryErr },
    { data: rescheduleHistory, error: rescheduleErr },
    { data: cancellationList, error: cancellationListErr },
  ] = await Promise.all([
    getReportData(from, to),
    getPaymentHistory(from, to),
    getRescheduleHistory(from, to),
    getCancellationList(from, to),
  ]);

  const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.total), 0);
  const totalCancellations = cancellations.reduce((sum, c) => sum + Number(c.count), 0);
  const totalPayments = revenue.reduce((sum, r) => sum + Number(r.payment_count), 0);
  const topStaff = staffStats.reduce((top, current) =>
    Number(current.revenue) > Number(top?.revenue || 0) ? current : top,
    staffStats[0],
  );

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">Track revenue, team activity, payments, and booking changes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/reports/export/xlsx?from=${from}&to=${to}`}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Export Excel
          </a>
          <a
            href={`/api/reports/export/pdf?from=${from}&to=${to}`}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Export PDF
          </a>
        </div>
      </div>

      <form method="get" className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          />
        </div>
        <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
          Apply filters
        </button>
      </form>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total revenue" value={`₱${totalRevenue.toLocaleString()}`} detail={`${totalPayments} recorded payments`} />
        <Metric label="Cancellations" value={totalCancellations} detail="Cancellations and no-shows" tone="rose" />
        <Metric label="Staff activity" value={staffStats.length} detail="Staff groups with activity" />
        <Metric label="Top performer" value={topStaff?.staff_name ?? "—"} detail={topStaff ? `₱${Number(topStaff.revenue).toLocaleString()} revenue` : "No activity recorded"} tone="violet" />
      </div>

      {/* Revenue */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Revenue" description="Collected payments grouped by method." />
        {revenueErr && <p className="text-sm text-rose-600">{revenueErr.message}</p>}
        <p className="mb-4 text-3xl font-semibold text-slate-900">₱{totalRevenue.toLocaleString()}</p>
        {revenue.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
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
          </table></div>
        ) : (
          <p className="text-sm text-gray-400">No payments recorded in this period.</p>
        )}
      </section>

      {/* Cancellations summary */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Cancellations &amp; no-shows" description="Understand why appointments were lost during this period." />
        {cancelErr && <p className="text-sm text-rose-600">{cancelErr.message}</p>}
        <p className="mb-4 text-3xl font-semibold text-slate-900">{totalCancellations}</p>
        {cancellations.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
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
          </table></div>
        ) : (
          <p className="text-sm text-gray-400">No cancellations in this period.</p>
        )}
      </section>

      {/* Staff performance (now includes Unassigned) */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Staff performance" description="Compare completed work, losses, and revenue by staff member." />
        {staffErr && <p className="text-sm text-rose-600">{staffErr.message}</p>}
        {staffStats.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
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
                <tr key={s.staff_id ?? "unassigned"} className="border-b border-gray-100">
                  <td className={`py-1.5 ${s.staff_id === null ? "italic text-gray-500" : ""}`}>
                    {s.staff_name}
                  </td>
                  <td className="py-1.5 text-right">{s.completed_count}</td>
                  <td className="py-1.5 text-right">{s.cancelled_count}</td>
                  <td className="py-1.5 text-right">{s.no_show_count}</td>
                  <td className="py-1.5 text-right">₱{Number(s.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-gray-400">No staff activity in this period.</p>
        )}
      </section>

      {/* Payment history */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Payment history" description={`Most recent ${paymentHistory.length === 200 ? "200" : "records"} first.`} />
        {paymentHistoryErr && <p className="text-sm text-rose-600">{paymentHistoryErr.message}</p>}
        {paymentHistory.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 font-normal">Date</th>
                <th className="py-1 font-normal">Client</th>
                <th className="py-1 font-normal">Service</th>
                <th className="py-1 font-normal">Method</th>
                <th className="py-1 font-normal text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((p) => {
                const client = singularize(p.bookings?.clients);
                const service = singularize(p.bookings?.services);
                return (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-1.5">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-1.5">{client?.full_name ?? "—"}</td>
                    <td className="py-1.5">{service?.name ?? "—"}</td>
                    <td className="py-1.5 capitalize">{p.method.replace("_", " ")}</td>
                    <td className="py-1.5 text-right">₱{Number(p.amount).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-gray-400">No payments in this period.</p>
        )}
      </section>

      {/* Reschedule history */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Rescheduled bookings" description={`Most recent ${rescheduleHistory.length === 200 ? "200" : "records"} first.`} />
        {rescheduleErr && <p className="text-sm text-rose-600">{rescheduleErr.message}</p>}
        {rescheduleHistory.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 font-normal">Rescheduled on</th>
                <th className="py-1 font-normal">Client</th>
                <th className="py-1 font-normal">Old time</th>
                <th className="py-1 font-normal">New time</th>
                <th className="py-1 font-normal">By</th>
              </tr>
            </thead>
            <tbody>
              {rescheduleHistory.map((r) => {
                const client = singularize(r.booking?.clients);
                const actor = singularize(r.actor);
                return (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-1.5">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-1.5">{client?.full_name ?? "—"}</td>
                    <td className="py-1.5 text-gray-500">
                      {r.details?.old_start_time ? new Date(r.details.old_start_time).toLocaleString() : "—"}
                    </td>
                    <td className="py-1.5">
                      {r.details?.new_start_time ? new Date(r.details.new_start_time).toLocaleString() : "—"}
                    </td>
                    <td className="py-1.5">{actor?.full_name ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-gray-400">No reschedules in this period.</p>
        )}
      </section>

      {/* Cancellation / no-show list */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Cancelled &amp; no-show list" description={`Most recent ${cancellationList.length === 200 ? "200" : "records"} first.`} />
        {cancellationListErr && <p className="text-sm text-rose-600">{cancellationListErr.message}</p>}
        {cancellationList.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 font-normal">Date</th>
                <th className="py-1 font-normal">Client</th>
                <th className="py-1 font-normal">Service</th>
                <th className="py-1 font-normal">Staff</th>
                <th className="py-1 font-normal">Status</th>
                <th className="py-1 font-normal">Reason</th>
              </tr>
            </thead>
            <tbody>
              {cancellationList.map((c) => {
                const client = singularize(c.clients);
                const service = singularize(c.services);
                const staffDetails = singularize(c.staff_details);
                const staffProfile = singularize(staffDetails?.profiles ?? null);
                const canceller = singularize(c.cancelled_by);
                return (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="py-1.5">{c.cancelled_at ? new Date(c.cancelled_at).toLocaleString() : "—"}</td>
                    <td className="py-1.5">{client?.full_name ?? "—"}</td>
                    <td className="py-1.5">{service?.name ?? "—"}</td>
                    <td className="py-1.5 italic text-gray-500">{staffProfile?.full_name ?? "Unassigned"}</td>
                    <td className="py-1.5 capitalize">{c.status.replace("_", " ")}</td>
                    <td className="py-1.5">
                      <span className="capitalize">{c.cancellation_reason?.replace("_", " ") ?? "—"}</span>
                      {c.cancellation_note && (
                        <span className="text-gray-400"> — {c.cancellation_note}</span>
                      )}
                      {canceller?.full_name && (
                        <span className="text-gray-400 block text-xs">by {canceller.full_name}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-gray-400">No cancellations or no-shows in this period.</p>
        )}
      </section>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "rose" | "violet";
}) {
  const toneClass = {
    default: "border-slate-200 bg-white",
    rose: "border-rose-200 bg-rose-50",
    violet: "border-violet-200 bg-violet-50",
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}
