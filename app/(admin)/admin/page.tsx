import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayInClinicTZ } from "@/lib/date";
import { getReportData } from "@/lib/reports";
import { KpiCard } from "@/components/admin/KpiCard";
import { StatCard } from "@/components/admin/StatCard";
import { StaffOnDuty } from "@/components/admin/StaffOnDuty";
import { AlertBanner } from "@/components/admin/AlertBanner";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { QuickActions } from "@/components/admin/QuickActions";

function singularize<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const today = todayInClinicTZ();
  const dayStartISO = new Date(`${today}T00:00:00`).toISOString();
  const dayEndISO = new Date(new Date(`${today}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  // Business-wide bookings today — every staff member, not just one.
  const { data: bookingsToday } = await supabase
    .from("bookings")
    .select("id, status, services(price)")
    .gte("start_time", dayStartISO)
    .lt("start_time", dayEndISO);

  const bookingIds = (bookingsToday || []).map((b) => b.id);
  const { data: paymentsToday } = bookingIds.length
    ? await supabase.from("payments").select("booking_id, amount, status, created_at").in("booking_id", bookingIds)
    : { data: [] };

  const paidByBooking = new Map<string, number>();
  let revenueCollectedToday = 0;
  (paymentsToday || []).forEach((p) => {
    if (p.status !== "paid") return;
    if (p.created_at >= dayStartISO && p.created_at < dayEndISO) {
      revenueCollectedToday += Number(p.amount);
    }
    paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) || 0) + Number(p.amount));
  });

  const totalToday = bookingsToday?.length || 0;
  const completedToday = (bookingsToday || []).filter((b) => b.status === "completed").length;
  const cancelledToday = (bookingsToday || []).filter((b) => ["cancelled", "no_show"].includes(b.status)).length;
  const balanceDueToday = (bookingsToday || []).reduce((sum, b) => {
    const service = singularize(b.services);
    const price = service?.price ?? 0;
    const paid = paidByBooking.get(b.id) || 0;
    return sum + Math.max(price - paid, 0);
  }, 0);

  // Staff on duty today
  const { data: shiftsToday } = await supabase
    .from("staff_shifts")
    .select("staff_id, start_time, end_time, staff_details(profiles(full_name))")
    .eq("shift_date", today)
    .order("start_time");

  // Month-at-a-glance, reusing the same aggregation the Reports page uses
  const { revenue, cancellations } = await getReportData(firstOfMonth, today);
  const monthRevenue = revenue.reduce((sum, r) => sum + Number(r.total), 0);
  const monthCancellations = cancellations.reduce((sum, c) => sum + Number(c.count), 0);

  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Prepare staff data
  const staffData = (shiftsToday || []).map((s) => {
    const profile = singularize(s.staff_details)?.profiles;
    const name = singularize(profile ?? null)?.full_name ?? "Staff";
    return {
      name,
      startTime: s.start_time,
      endTime: s.end_time,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">{dateLabel}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <QuickActions
          actions={[
            { icon: "📅", label: "New Booking", href: "/staff/dashboard/bookings/new", variant: "primary" },
            { icon: "👥", label: "Manage Staff", href: "/admin/staff", variant: "secondary" },
            { icon: "⏰", label: "Schedule", href: "/admin/staff-schedule", variant: "secondary" },
            { icon: "📊", label: "Reports", href: "/admin/reports", variant: "secondary" },
            { icon: "🔧", label: "Settings", href: "/admin/settings", variant: "secondary" },
          ]}
        />

        {/* Alert Banner */}
        {balanceDueToday > 0 && (
          <div className="mb-6">
            <AlertBanner
              type="warning"
              title={`₱${balanceDueToday.toLocaleString()} Outstanding`}
              description="Balance due across today's bookings that haven't been fully paid"
            />
          </div>
        )}

        {/* Today's KPIs */}
        <div className="mb-8">
          <SectionHeader title="Today's Performance" subtitle="Real-time clinic metrics" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon="📅"
              label="Total Bookings"
              value={totalToday}
              status={totalToday === 0 ? "neutral" : "success"}
            />
            <KpiCard
              icon="✅"
              label="Completed"
              value={completedToday}
              status={completedToday > 0 ? "success" : "neutral"}
            />
            <KpiCard
              icon="❌"
              label="Cancelled/No-show"
              value={cancelledToday}
              status={cancelledToday > 0 ? "danger" : "success"}
            />
            <KpiCard
              icon="💰"
              label="Revenue Collected"
              value={`₱${revenueCollectedToday.toLocaleString()}`}
              status="success"
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Staff On Duty */}
          <div className="lg:col-span-2">
            <StaffOnDuty staff={staffData} scheduleUrl={`/admin/staff-schedule/${today}`} />
          </div>

          {/* This Month Stats */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <SectionHeader title="This Month" subtitle="Year-to-date overview" />
            <div className="space-y-3">
              <StatCard
                label="Total Revenue"
                value={`₱${monthRevenue.toLocaleString()}`}
                sublabel="All payments received"
              />
              <StatCard
                label="Cancellations"
                value={monthCancellations}
                sublabel="No-shows & cancellations"
              />
              <Link
                href="/admin/reports"
                className="block mt-4 text-center px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition font-medium text-sm"
              >
                View Full Reports →
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Navigation Grid */}
        <div className="mb-8">
          <SectionHeader title="Administration" subtitle="Manage your clinic" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/services"
              className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md hover:border-blue-300 transition text-center"
            >
              <div className="text-3xl mb-2">🏥</div>
              <h3 className="font-semibold text-slate-900">Services</h3>
              <p className="text-xs text-slate-500 mt-1">Manage clinic services</p>
            </Link>
            <Link
              href="/admin/staff"
              className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md hover:border-blue-300 transition text-center"
            >
              <div className="text-3xl mb-2">👤</div>
              <h3 className="font-semibold text-slate-900">Staff</h3>
              <p className="text-xs text-slate-500 mt-1">Manage team members</p>
            </Link>
            <Link
              href="/admin/staff-schedule"
              className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md hover:border-blue-300 transition text-center"
            >
              <div className="text-3xl mb-2">📆</div>
              <h3 className="font-semibold text-slate-900">Schedules</h3>
              <p className="text-xs text-slate-500 mt-1">Manage work shifts</p>
            </Link>
            <Link
              href="/admin/reports"
              className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md hover:border-blue-300 transition text-center"
            >
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-slate-900">Reports</h3>
              <p className="text-xs text-slate-500 mt-1">View analytics & insights</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
