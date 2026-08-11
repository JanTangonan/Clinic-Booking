"use client";

import { useRouter } from "next/navigation";
import { shiftDate, todayInClinicTZ } from "@/lib/date";

type ShiftEntry = {
  staff_id: string;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  staff_details: { profiles: { full_name: string } | { full_name: string }[] | null } | { profiles: { full_name: string } | { full_name: string }[] | null }[] | null;
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

function toMinutes(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

function staffName(shift: ShiftEntry) {
  const details = singularize(shift.staff_details);
  return singularize(details?.profiles ?? null)?.full_name ?? "Staff";
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 border-amber-400 text-amber-900",
  confirmed: "bg-blue-100 border-blue-400 text-blue-900",
  completed: "bg-green-100 border-green-400 text-green-700",
  cancelled: "bg-red-50 border-red-200 text-red-400 line-through",
  no_show: "bg-red-50 border-red-200 text-red-400 line-through",
};

export default function CalendarGrid({
  date,
  shifts,
  bookings,
}: {
  date: string;
  shifts: ShiftEntry[];
  bookings: Booking[];
}) {
  const router = useRouter();

  function goToDate(newDate: string) {
    router.push(`/dashboard/calendar?date=${newDate}`);
  }

  if (shifts.length === 0) {
    return (
      <div>
        <DateNav date={date} onNavigate={goToDate} />
        <p className="text-gray-500 text-sm mt-6">
          No staff scheduled to work this day.{" "}
          <a href={`/admin/staff-schedule/${date}`} className="underline">
            Set the schedule
          </a>
          .
        </p>
      </div>
    );
  }

  // Grid spans the earliest shift start to the latest shift end across
  // everyone working this specific date.
  const starts = shifts.map((s) => toMinutes(s.start_time));
  const ends = shifts.map((s) => toMinutes(s.end_time));
  const gridStart = Math.min(...starts);
  const gridEnd = Math.max(...ends);
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
    <div>
      <DateNav date={date} onNavigate={goToDate} />

      <h2 className="hidden print:block text-lg font-semibold mt-2">
        {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h2>

      <div className="mt-6 overflow-x-auto">
        <div
          className="grid border-t border-l"
          style={{ gridTemplateColumns: `80px repeat(${shifts.length}, minmax(160px, 1fr))` }}
        >
          <div className="border-b border-r bg-gray-50 print:bg-white" />
          {shifts.map((s) => (
            <div key={s.staff_id} className="border-b border-r bg-gray-50 print:bg-white px-2 py-2 text-sm font-medium">
              {staffName(s)}
            </div>
          ))}

          <div className="relative border-r" style={{ height: totalSlots * SLOT_PX }}>
            {timeLabels.map((label, i) => (
              <div
                key={label}
                className="absolute right-2 -translate-y-1/2 text-xs text-gray-400"
                style={{ top: i * SLOT_PX }}
              >
                {i % 2 === 0 ? label : ""}
              </div>
            ))}
          </div>

          {shifts.map((s) => {
            const staffOpen = toMinutes(s.start_time);
            const staffClose = toMinutes(s.end_time);
            const staffBookings = bookings.filter((b) => b.staff_id === s.staff_id);

            return (
              <div key={s.staff_id} className="relative border-r" style={{ height: totalSlots * SLOT_PX }}>
                {Array.from({ length: totalSlots }, (_, i) => {
                  const rowStart = gridStart + i * SLOT_MIN;
                  const outsideShift = rowStart < staffOpen || rowStart >= staffClose;
                  return (
                    <div
                      key={i}
                      className={`absolute w-full border-b ${outsideShift ? "bg-gray-50 print:bg-white" : ""}`}
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
                      className={`absolute left-1 right-1 rounded border px-2 py-1 text-left text-xs overflow-hidden print:cursor-default ${STATUS_STYLE[b.status] ?? "bg-gray-100 border-gray-300"}`}
                      style={{ top, height }}
                    >
                      <p className="font-medium truncate">{client?.full_name}</p>
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
  const today = todayInClinicTZ();
  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 print:hidden">
      <button
        onClick={() => onNavigate(shiftDate(date, -1))}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        ←
      </button>
      <button
        onClick={() => onNavigate(today)}
        className="rounded border border-gray-300 px-3 py-1 text-sm"
      >
        Today
      </button>
      <button
        onClick={() => onNavigate(shiftDate(date, 1))}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        →
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => onNavigate(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <span className="text-gray-500 text-sm ml-2">{displayDate}</span>
      <button
        onClick={() => window.print()}
        className="ml-auto rounded border border-gray-300 px-3 py-1 text-sm"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
