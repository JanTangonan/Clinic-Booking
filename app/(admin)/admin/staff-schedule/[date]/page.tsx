import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setStaffShift, removeStaffShift } from "../actions";

export default async function DayScheduleEditor({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, profiles(full_name)")
    .eq("active", true);

  const { data: shifts } = await supabase
    .from("staff_shifts")
    .select("staff_id, start_time, end_time")
    .eq("shift_date", date);

  const shiftByStaff = new Map((shifts || []).map((s) => [s.staff_id, s]));

  const [year, month, day] = date.split("-").map(Number);
  const dateObject = new Date(year, month - 1, day);
  const prevDate = new Date(dateObject);
  const nextDate = new Date(dateObject);
  prevDate.setDate(dateObject.getDate() - 1);
  nextDate.setDate(dateObject.getDate() + 1);
  const formatIsoDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dateLabel = dateObject.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalStaff = staff?.length ?? 0;
  const scheduledCount = shifts?.length ?? 0;
  const offCount = Math.max(0, totalStaff - scheduledCount);

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/admin/staff-schedule?month=${date.slice(0, 7)}`} className="text-sm text-slate-600 underline">
              ← Back to month view
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Staff schedule</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{dateLabel}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Set availability for each staff member and keep track of who is scheduled or off for the day.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/staff-schedule/${formatIsoDate(prevDate)}`}
              className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Previous day
            </Link>
            <Link
              href={`/admin/staff-schedule/${formatIsoDate(nextDate)}`}
              className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Next day
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total team</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{totalStaff}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Scheduled</p>
            <p className="mt-3 text-2xl font-semibold">{scheduledCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Off</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{offCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(staff || []).map((s) => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const shift = shiftByStaff.get(s.id);
          const startTime = shift?.start_time?.slice(0, 5) || "";
          const endTime = shift?.end_time?.slice(0, 5) || "";
          const duration = shift ? `${startTime}–${endTime}` : "—";

          return (
            <div key={s.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{profile?.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{shift ? "Scheduled for today" : "No shift assigned"}</p>
                </div>
                <div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${shift ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {shift ? "Scheduled" : "Off"}
                  </span>
                </div>
              </div>

              <form
                action={setStaffShift.bind(null, s.id, date)}
                className="mt-5 grid gap-4 sm:grid-cols-[1.1fr_1.1fr_0.8fr] sm:items-end"
              >
                <div>
                  <label htmlFor={`start-${s.id}`} className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Start time
                  </label>
                  <input
                    id={`start-${s.id}`}
                    type="time"
                    name="start_time"
                    defaultValue={startTime}
                    step="900"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor={`end-${s.id}`} className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                    End time
                  </label>
                  <input
                    id={`end-${s.id}`}
                    type="time"
                    name="end_time"
                    defaultValue={endTime}
                    step="900"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div className="flex items-end gap-3">
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {shift ? "Update shift" : "Save shift"}
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Duration:</span>
                  <span>{duration}</span>
                </div>
                {shift && (
                  <form action={removeStaffShift.bind(null, s.id, date)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Remove shift
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(staff || []).length === 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No active staff yet —{' '}
          <Link href="/admin/staff/new" className="underline">
            add one first
          </Link>
          .
        </div>
      )}
    </div>
  );
}
