"use client";

import { useRouter } from "next/navigation";

type StaffMember = {
  id: string;
  working_hours: Record<string, [string, string] | null>;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type Booking = {
  id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: string;
  clients: { full_name: string } | { full_name: string }[] | null;
  services: { name: string } | { name: string }[] | null;
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOT_PX = 48; // pixel height per 30-minute row
const SLOT_MIN = 30;

function singularize<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 border-amber-300 text-amber-900",
  confirmed: "bg-sky-50 border-sky-300 text-sky-900",
  completed: "bg-slate-100 border-slate-300 text-slate-700",
  cancelled: "bg-rose-50 border-rose-200 text-rose-700 line-through",
  no_show: "bg-rose-50 border-rose-200 text-rose-700 line-through",
};

export default function CalendarGrid({
  date,
  staff,
  bookings,
}: {
  date: string;
  staff: StaffMember[];
  bookings: Booking[];
}) {
  const router = useRouter();
  const dayKey = DAY_KEYS[new Date(`${date}T00:00:00`).getDay()];

  const workingStaff = staff.filter((s) => s.working_hours?.[dayKey]);

  function goToDate(newDate: string) {
    router.push(`/dashboard/calendar?date=${newDate}`);
  }

  if (workingStaff.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <DateNav date={date} onNavigate={goToDate} />
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No staff are scheduled to work on this day.
        </div>
      </div>
    );
  }

  // Grid spans the earliest open to the latest close across all staff
  // working that day, so every staff member's full shift is visible.
  const opens = workingStaff.map((s) => toMinutes(s.working_hours[dayKey]![0]));
  const closes = workingStaff.map((s) => toMinutes(s.working_hours[dayKey]![1]));
  const gridStart = Math.min(...opens);
  const gridEnd = Math.max(...closes);
  const totalSlots = Math.ceil((gridEnd - gridStart) / SLOT_MIN);

  const timeLabels = Array.from({ length: totalSlots + 1 }, (_, i) => {
    const mins = gridStart + i * SLOT_MIN;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <DateNav date={date} onNavigate={goToDate} />

      <div className="mt-5 overflow-x-auto">
        <div
          className="grid rounded-xl border border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: `90px repeat(${workingStaff.length}, minmax(180px, 1fr))` }}
        >
          <div className="border-b border-r border-slate-200 bg-white" />
          {workingStaff.map((s) => (
            <div key={s.id} className="border-b border-r border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800">
              {singularize(s.profiles)?.full_name ?? "Staff"}
            </div>
          ))}

          <div className="relative border-r border-slate-200 bg-white" style={{ height: totalSlots * SLOT_PX }}>
            {timeLabels.map((label, i) => (
              <div
                key={label}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-400"
                style={{ top: i * SLOT_PX }}
              >
                {i % 2 === 0 ? label : ""}
              </div>
            ))}
          </div>

          {workingStaff.map((s) => {
            const [openStr, closeStr] = s.working_hours[dayKey]!;
            const staffOpen = toMinutes(openStr);
            const staffClose = toMinutes(closeStr);
            const staffBookings = bookings.filter((b) => b.staff_id === s.id);

            return (
              <div key={s.id} className="relative border-r border-slate-200 bg-white" style={{ height: totalSlots * SLOT_PX }}>
                {Array.from({ length: totalSlots }, (_, i) => {
                  const rowStart = gridStart + i * SLOT_MIN;
                  const outsideShift = rowStart < staffOpen || rowStart >= staffClose;
                  return (
                    <div
                      key={i}
                      className={`absolute w-full border-b border-slate-100 ${outsideShift ? "bg-slate-50" : "bg-white"}`}
                      style={{ top: i * SLOT_PX, height: SLOT_PX }}
                    />
                  );
                })}

                {staffBookings.map((b) => {
                  const start = new Date(b.start_time);
                  const end = new Date(b.end_time);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const durationMin = (end.getTime() - start.getTime()) / 60000;
                  const top = ((startMin - gridStart) / SLOT_MIN) * SLOT_PX;
                  const height = Math.max((durationMin / SLOT_MIN) * SLOT_PX - 2, 20);

                  const client = singularize(b.clients);
                  const service = singularize(b.services);

                  return (
                    <button
                      key={b.id}
                      onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                      className={`absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1.5 text-left text-[11px] shadow-sm transition hover:shadow-md ${STATUS_STYLE[b.status] ?? "bg-slate-100 border-slate-300"}`}
                      style={{ top, height }}
                    >
                      <p className="truncate font-semibold">{client?.full_name}</p>
                      <p className="truncate">{service?.name}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DateNav({ date, onNavigate }: { date: string; onNavigate: (d: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{displayDate}</p>
        <p className="text-sm text-slate-500">Navigate through the day’s appointments</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onNavigate(shiftDate(date, -1))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          ← Previous
        </button>
        <button
          onClick={() => onNavigate(today)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate(shiftDate(date, 1))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          Next →
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => onNavigate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
      </div>
    </div>
  );
}
