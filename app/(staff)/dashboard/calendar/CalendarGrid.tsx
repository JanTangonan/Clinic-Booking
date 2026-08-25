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
  staff_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  clients: { full_name: string } | { full_name: string }[] | null;
  services: { name: string } | { name: string }[] | null;
};

type LaidOutBooking = Booking & { lane: number; laneCount: number };

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

// Groups a list of bookings into clusters of transitively-overlapping
// time ranges, then assigns each booking a lane within its cluster —
// the same shape of algorithm calendar UIs (Google Calendar included)
// use to lay overlapping events side by side. Bookings that don't
// overlap anything get laneCount = 1 (full width); bookings caught in
// a 3-way overlap each get laneCount = 3 (one third width), etc. —
// scoped to just that cluster, not the whole day, so unrelated
// bookings elsewhere in the column stay full width.
function layoutBookings(bookings: Booking[]): LaidOutBooking[] {
  const sorted = [...bookings]
    .map((b) => ({ ...b, _start: new Date(b.start_time).getTime(), _end: new Date(b.end_time).getTime() }))
    .sort((a, b) => a._start - b._start);

  const result: LaidOutBooking[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const withLane = cluster.map((b) => {
      let lane = laneEnds.findIndex((endTime) => endTime <= b._start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(b._end);
      } else {
        laneEnds[lane] = b._end;
      }
      return { ...b, lane };
    });
    const laneCount = laneEnds.length;
    withLane.forEach(({ _start, _end, lane, ...booking }) => {
      result.push({ ...(booking as Booking), lane, laneCount });
    });
    cluster = [];
  }

  for (const b of sorted) {
    if (cluster.length === 0 || b._start < clusterEnd) {
      cluster.push(b);
      clusterEnd = Math.max(clusterEnd, b._end);
    } else {
      flushCluster();
      cluster.push(b);
      clusterEnd = b._end;
    }
  }
  flushCluster();

  return result;
}

function BookingBlock({
  booking,
  gridStart,
  onClick,
}: {
  booking: LaidOutBooking;
  gridStart: number;
  onClick: () => void;
}) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  const top = ((startMin - gridStart) / SLOT_MIN) * SLOT_PX;
  const height = Math.max((durationMin / SLOT_MIN) * SLOT_PX - 2, 20);

  const client = singularize(booking.clients);
  const service = singularize(booking.services);

  return (
    <button
      onClick={onClick}
      className={`absolute rounded border px-2 py-1 text-left text-xs overflow-hidden print:cursor-default ${STATUS_STYLE[booking.status] ?? "bg-gray-100 border-gray-300"}`}
      style={{
        top,
        height,
        left: `calc(${(booking.lane / booking.laneCount) * 100}% + 2px)`,
        width: `calc(${100 / booking.laneCount}% - 4px)`,
      }}
    >
      <p className="font-medium truncate">{client?.full_name}</p>
      <p className="truncate">{service?.name}</p>
    </button>
  );
}

export default function CalendarGrid({
  date,
  shifts,
  bookings,
  unassignedBookings,
}: {
  date: string;
  shifts: ShiftEntry[];
  bookings: Booking[];
  unassignedBookings: Booking[];
}) {
  const router = useRouter();

  function goToDate(newDate: string) {
    router.push(`/dashboard/calendar?date=${newDate}`);
  }

  if (shifts.length === 0 && unassignedBookings.length === 0) {
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

  const starts = shifts.map((s) => toMinutes(s.start_time));
  const ends = shifts.map((s) => toMinutes(s.end_time));
  // If there are unassigned bookings but nobody's shift covers them
  // (e.g. reservation taken for a day nobody's scheduled yet), widen
  // the grid to still show those times rather than clipping them.
  const bookingStarts = unassignedBookings.map((b) => {
    const d = new Date(b.start_time);
    return d.getHours() * 60 + d.getMinutes();
  });
  const bookingEnds = unassignedBookings.map((b) => {
    const d = new Date(b.end_time);
    return d.getHours() * 60 + d.getMinutes();
  });

  const allStartMinutes = [...starts, ...bookingStarts];
  const allEndMinutes = [...ends, ...bookingEnds];
  const gridStart = allStartMinutes.length ? Math.min(...allStartMinutes) : 9 * 60;
  const gridEnd = allEndMinutes.length ? Math.max(...allEndMinutes) : 18 * 60;
  const totalSlots = Math.ceil((gridEnd - gridStart) / SLOT_MIN);

  const timeLabels = Array.from({ length: totalSlots + 1 }, (_, i) => {
    const mins = gridStart + i * SLOT_MIN;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  });

  const columnCount = shifts.length + (unassignedBookings.length > 0 ? 1 : 0);

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
          style={{ gridTemplateColumns: `80px repeat(${columnCount}, minmax(160px, 1fr))` }}
        >
          <div className="border-b border-r bg-gray-50 print:bg-white" />

          {unassignedBookings.length > 0 && (
            <div className="border-b border-r border-dashed bg-gray-50 print:bg-white px-2 py-2 text-sm font-medium text-gray-500">
              Unassigned
            </div>
          )}
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

          {unassignedBookings.length > 0 && (
            <div className="relative border-r border-dashed" style={{ height: totalSlots * SLOT_PX }}>
              {Array.from({ length: totalSlots }, (_, i) => (
                <div key={i} className="absolute w-full border-b" style={{ top: i * SLOT_PX, height: SLOT_PX }} />
              ))}
              {layoutBookings(unassignedBookings).map((b) => (
                <BookingBlock
                  key={b.id}
                  booking={b}
                  gridStart={gridStart}
                  onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                />
              ))}
            </div>
          )}

          {shifts.map((s) => {
            const staffOpen = toMinutes(s.start_time);
            const staffClose = toMinutes(s.end_time);
            const staffBookings = bookings.filter((b) => b.staff_id === s.staff_id);
            const laidOut = layoutBookings(staffBookings);

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

                {laidOut.map((b) => (
                  <BookingBlock
                    key={b.id}
                    booking={b}
                    gridStart={gridStart}
                    onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                  />
                ))}
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
