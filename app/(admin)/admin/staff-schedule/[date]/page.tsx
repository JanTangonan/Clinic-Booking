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
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <Link href={`/admin/staff-schedule?month=${date.slice(0, 7)}`} className="text-sm text-slate-600 underline">
            ← Back to month view
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Staff schedule</p>
            <h1 className="text-3xl font-semibold text-slate-900">{dateLabel}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/staff-schedule/${formatIsoDate(prevDate)}`}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Previous day
            </Link>
            <Link
              href={`/admin/staff-schedule/${formatIsoDate(nextDate)}`}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Next day
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{totalStaff} staff</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{scheduledCount} scheduled</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{offCount} off</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.6fr_1.2fr_1fr_0.8fr_1.4fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs uppercase tracking-[0.12em] text-slate-500 sm:grid">
          <div>Staff</div>
          <div>Shift</div>
          <div>Duration</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-200 bg-white">
          {(staff || []).map((s) => {
            const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            const shift = shiftByStaff.get(s.id);
            const startTime = shift?.start_time?.slice(0, 5) || "";
            const endTime = shift?.end_time?.slice(0, 5) || "";
            const duration = shift ? `${startTime}–${endTime}` : "—";

            return (
              <div key={s.id} className="px-4 py-5 sm:grid sm:grid-cols-[1.6fr_1.2fr_1fr_0.8fr_1.4fr] sm:items-center sm:gap-4">
                <div className="mb-4 sm:mb-0">
                  <p className="font-medium text-slate-900">{profile?.full_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{shift ? `Shift configured` : "No shift yet"}</p>
                </div>

                <div className="sm:col-span-2">
                  <form action={setStaffShift.bind(null, s.id, date)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div>
                      <label htmlFor={`start-${s.id}`} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-2">
                        Start
                      </label>
                      <input
                        id={`start-${s.id}`}
                        type="time"
                        name="start_time"
                        defaultValue={startTime}
                        step="900"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor={`end-${s.id}`} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-2">
                        End
                      </label>
                      <input
                        id={`end-${s.id}`}
                        type="time"
                        name="end_time"
                        defaultValue={endTime}
                        step="900"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        {shift ? "Update" : "Save"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="hidden sm:block text-slate-700">{duration}</div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      shift ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {shift ? "Scheduled" : "Off"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end text-right">
                  {shift && (
                    <form action={removeStaffShift.bind(null, s.id, date)}>
                      <button type="submit" className="rounded-full px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(staff || []).length === 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No active staff yet — {" "}
          <Link href="/admin/staff/new" className="underline">
            add one first
          </Link>
          .
        </div>
      )}
    </div>
  );
}
