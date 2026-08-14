import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayInClinicTZ } from "@/lib/date";

function singularize<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 border-amber-300 text-amber-700",
  confirmed: "bg-blue-50 border-blue-300 text-blue-700",
  completed: "bg-green-50 border-green-300 text-green-700",
  cancelled: "bg-red-50 border-red-200 text-red-400",
  no_show: "bg-red-50 border-red-200 text-red-400",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
  no_show: "bg-red-400",
};

export default async function StaffDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id)
    .single();

  const today = todayInClinicTZ();
  const dayStartISO = new Date(`${today}T00:00:00`).toISOString();
  const dayEndISO = new Date(new Date(`${today}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_time, status, clients(full_name), services(name, price)")
    .eq("staff_id", user?.id)
    .gte("start_time", dayStartISO)
    .lt("start_time", dayEndISO)
    .order("start_time");

  const bookingIds = (bookings || []).map((b) => b.id);
  const { data: payments } = bookingIds.length
    ? await supabase.from("payments").select("booking_id, amount, status").in("booking_id", bookingIds)
    : { data: [] };

  const paidByBooking = new Map<string, number>();
  (payments || [])
    .filter((p) => p.status === "paid")
    .forEach((p) => {
      paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) || 0) + Number(p.amount));
    });

  const totalToday = bookings?.length || 0;
  const completedToday = (bookings || []).filter((b) => b.status === "completed").length;
  const remainingToday = (bookings || []).filter((b) => ["pending", "confirmed"].includes(b.status)).length;
  const cancelledToday = (bookings || []).filter((b) => b.status === "cancelled").length;
  
  const totalBalanceDue = (bookings || []).reduce((sum, b) => {
    const service = singularize(b.services);
    const price = service?.price ?? 0;
    const paid = paidByBooking.get(b.id) || 0;
    return sum + Math.max(price - paid, 0);
  }, 0);

  const totalExpectedRevenue = (bookings || []).reduce((sum, b) => {
    const service = singularize(b.services);
    return sum + (service?.price ?? 0);
  }, 0);

  const totalPaidToday = (bookings || []).reduce((sum, b) => {
    return sum + (paidByBooking.get(b.id) || 0);
  }, 0);

  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const bookingsWithUnpaid = (bookings || []).filter((b) => {
    const service = singularize(b.services);
    const price = service?.price ?? 0;
    const paid = paidByBooking.get(b.id) || 0;
    return Math.max(price - paid, 0) > 0;
  });

  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome"}
              </h1>
              <p className="text-lg text-slate-600 mt-1">{dateLabel}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/clients/new" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                <span>➕</span> Add client
              </Link>
              <Link href="/dashboard/bookings/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                <span>✏️</span> New booking
              </Link>
              <Link href="/dashboard/calendar" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                <span>📅</span> Calendar
              </Link>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Performance Cards - Left Side */}
          <div className="lg:col-span-2 space-y-4">
            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Progress</h2>
                <span className="text-3xl font-bold text-green-600">{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all" 
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{completedToday}</p>
                  <p className="text-xs text-green-600 font-medium">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{remainingToday}</p>
                  <p className="text-xs text-blue-600 font-medium">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{cancelledToday}</p>
                  <p className="text-xs text-red-600 font-medium">Cancelled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{totalToday}</p>
                  <p className="text-xs text-slate-600 font-medium">Total</p>
                </div>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium uppercase mb-1">Expected</p>
                  <p className="text-2xl font-bold text-blue-900">₱{totalExpectedRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-600 font-medium uppercase mb-1">Received</p>
                  <p className="text-2xl font-bold text-green-900">₱{totalPaidToday.toLocaleString()}</p>
                </div>
                <div className={`bg-gradient-to-br ${totalBalanceDue > 0 ? 'from-red-50 to-red-100' : 'from-slate-50 to-slate-100'} rounded-lg p-4 border ${totalBalanceDue > 0 ? 'border-red-200' : 'border-slate-200'}`}>
                  <p className={`text-xs font-medium uppercase mb-1 ${totalBalanceDue > 0 ? 'text-red-600' : 'text-slate-600'}`}>Outstanding</p>
                  <p className={`text-2xl font-bold ${totalBalanceDue > 0 ? 'text-red-900' : 'text-slate-900'}`}>₱{totalBalanceDue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts - Right Side */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Attention Needed</h2>
            
            {totalBalanceDue > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-red-900">⚠️ Unpaid Balance</p>
                <p className="text-xs text-red-700 mt-1">₱{totalBalanceDue.toLocaleString()} from {bookingsWithUnpaid.length} booking{bookingsWithUnpaid.length !== 1 ? 's' : ''}</p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-green-900">✓ All Paid</p>
                <p className="text-xs text-green-700 mt-1">No outstanding payments</p>
              </div>
            )}

            {cancelledToday > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-amber-900">⚠️ Cancellations</p>
                <p className="text-xs text-amber-700 mt-1">{cancelledToday} booking{cancelledToday !== 1 ? 's' : ''} cancelled today</p>
              </div>
            )}

            {remainingToday > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-blue-900">📋 Upcoming</p>
                <p className="text-xs text-blue-700 mt-1">{remainingToday} booking{remainingToday !== 1 ? 's' : ''} still to complete</p>
              </div>
            )}

            {totalToday === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-900">✓ No Bookings</p>
                <p className="text-xs text-slate-700 mt-1">Your schedule is clear today</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Schedule Section */}
        {totalToday > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Today&apos;s Schedule</h2>
            <div className="space-y-3">
              {bookings?.map((b, idx) => {
                const client = singularize(b.clients);
                const service = singularize(b.services);
                const paid = paidByBooking.get(b.id) || 0;
                const balance = Math.max((service?.price ?? 0) - paid, 0);
                const time = new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <Link key={b.id} href={`/dashboard/bookings/${b.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group">
                      {/* Timeline Dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${STATUS_DOT[b.status] ?? "bg-gray-400"}`}></div>
                        {idx < (bookings?.length ?? 0) - 1 && <div className="w-0.5 h-12 bg-slate-200 mt-2"></div>}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                              {time} · {client?.full_name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {service?.name}
                              {balance > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded inline-block">
                                  ₱{balance} due
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[b.status] ?? ""}`}>
                            {b.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {totalToday === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-2xl text-slate-900 font-semibold mb-2">No bookings today</p>
            <p className="text-slate-600 mb-6">You have a clear schedule! Use this time for admin work or planning.</p>
            <Link href="/dashboard/calendar" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
              <span>📅</span> Check full calendar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
