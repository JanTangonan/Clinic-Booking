import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentMonthInClinicTZ, getMonthGrid, shiftMonth, todayInClinicTZ } from "@/lib/date";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ShiftRow = {
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  staff_details: { profiles: { full_name: string } | { full_name: string }[] | null } | { profiles: { full_name: string } | { full_name: string }[] | null }[] | null;
};

// Helper function to singularize a value that may be an array or null. If the value is an array, it returns the first element; otherwise, it returns the value itself.
function singularize<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Extracts the staff member's name from a shift entry, handling cases where the profiles field may be an array or null.
function shiftStaffName(s: ShiftRow) {
  const details = singularize(s.staff_details);
  return singularize(details?.profiles ?? null)?.full_name ?? "Staff";
}

// Converts a time string in "HH:MM:SS" format to a 12-hour format with AM/PM.
function formatTimeToAmPm(time: string) {
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  return `${hour}:${String(minute).padStart(2, "0")}${period}`;
}

// Opening and Closing shifts are grouped for display purposes. This function determines which group a shift belongs to based on its start time.
function getShiftGroup(startTime: string) {
  const [h] = startTime.split(":").map(Number);
  return h < 11 ? "Opening shifts" : "Closing shifts";
}

export default async function StaffSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonthInClinicTZ();

  const weeks = getMonthGrid(month);
  const today = todayInClinicTZ();

  const monthDates = weeks.flat().filter((d): d is string => !!d);
  const rangeStart = monthDates[0];
  const rangeEnd = monthDates[monthDates.length - 1];

  const supabase = await createClient();
  const { data: shifts } = await supabase
    .from("staff_shifts")
    .select("staff_id, shift_date, start_time, end_time, staff_details(profiles(full_name))")
    .gte("shift_date", rangeStart)
    .lte("shift_date", rangeEnd)
    .order("start_time");

  const shiftsByDate = new Map<string, ShiftRow[]>();
  (shifts || []).forEach((s) => {
    const list = shiftsByDate.get(s.shift_date) || [];
    list.push(s as ShiftRow);
    shiftsByDate.set(s.shift_date, list);
  });

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="p-8">
      {/* Month navigation and header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Staff schedule</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/staff-schedule?month=${shiftMonth(month, -1)}`}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            ←
          </Link>
          <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
          <Link
            href={`/admin/staff-schedule?month=${shiftMonth(month, 1)}`}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            →
          </Link>
          <Link
            href={`/admin/staff-schedule?month=${currentMonthInClinicTZ()}`}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            This month
          </Link>
        </div>
      </div>

      {/* Legend for shift groups */}
      <p className="text-xs text-gray-400 mb-4">
        Click a day to set who&apos;s working and their hours — schedules are set per day now,
        not a repeating weekly pattern.
      </p>

      {/* Grid of days with shifts */}
      <div className="grid grid-cols-7 border-t border-l text-sm">
        {DAY_LABELS.map((label) => (
          <div key={label} className="border-b border-r bg-gray-50 px-2 py-1.5 font-medium text-gray-600">
            {label}
          </div>
        ))}

        {weeks.flatMap((week, weekIdx) =>
          week.map((date, dayIdx) => {
            if (!date) {
              return (
                <div key={`${weekIdx}-${dayIdx}`} className="border-b border-r bg-gray-50 min-h-24" />
              );
            }

            const dayShifts = (shiftsByDate.get(date) || [])
              .slice()
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
            const dayNumber = Number(date.slice(-2));
            const isToday = date === today;

            const grouped: Record<string, ShiftRow[]> = {};
            dayShifts.forEach((s) => {
              const g = getShiftGroup(s.start_time);
              grouped[g] = [...(grouped[g] || []), s];
            });
            const groupLabels = ["Opening shifts", "Closing shifts"];

            return (
              <Link
                key={date}
                href={`/admin/staff-schedule/${date}`}
                className={`border-b border-r min-h-24 p-1.5 hover:bg-gray-50 ${isToday ? "bg-blue-50" : ""}`}
              >
                <p className={`text-xs mb-1 ${isToday ? "font-semibold text-blue-700" : "text-gray-500"}`}>
                  {dayNumber}
                </p>
                <div className="space-y-0.5">
                  {groupLabels.map((groupLabel) => {
                    const group = grouped[groupLabel];
                    if (!group?.length) return null;
                    return (
                      <div key={groupLabel} className="space-y-0.5">
                        {Object.keys(grouped).length > 1 && (
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">
                            {groupLabel}
                          </p>
                        )}
                        {group.map((s) => (
                          <div
                            key={s.staff_id}
                            className="flex items-center justify-between gap-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800"
                          >
                            <span className="truncate font-medium">{shiftStaffName(s)}</span>
                            <span className="shrink-0 text-right text-[10px] font-semibold text-blue-700">
                              {formatTimeToAmPm(s.start_time)}-{formatTimeToAmPm(s.end_time)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {dayShifts.length === 0 && <p className="text-xs text-gray-300">—</p>}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
