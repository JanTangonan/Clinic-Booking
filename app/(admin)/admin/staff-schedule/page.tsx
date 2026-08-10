import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentMonthInClinicTZ, getMonthGrid, shiftMonth, todayInClinicTZ } from "@/lib/date";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type StaffMember = {
  id: string;
  working_hours: Record<string, [string, string] | null>;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

function singularize<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function formatTimeToAmPm(time?: string | null) {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;

  const minutePadded = String(minute).padStart(2, "0");
  return `${hour}:${minutePadded}${period}`;
}

function formatShift(hours?: [string, string] | null) {
  const start = formatTimeToAmPm(hours?.[0] ?? null);
  const end = formatTimeToAmPm(hours?.[1] ?? null);
  if (!start || !end) return null;
  return `${start} - ${end}`;
}

function getShiftGroup(hours?: [string, string] | null) {
  const startMinutes = parseTimeToMinutes(hours?.[0] ?? null);
  if (startMinutes === null) return "Other shifts";
  return startMinutes < 12 * 60 ? "Morning shifts" : "Afternoon shifts";
}

function compareStaffByShift(a: StaffMember, b: StaffMember, dayKey: string) {
  const aHours = a.working_hours?.[dayKey];
  const bHours = b.working_hours?.[dayKey];
  const aStart = parseTimeToMinutes(aHours?.[0] ?? null) ?? Number.MAX_SAFE_INTEGER;
  const bStart = parseTimeToMinutes(bHours?.[0] ?? null) ?? Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;

  const aEnd = parseTimeToMinutes(aHours?.[1] ?? null) ?? Number.MAX_SAFE_INTEGER;
  const bEnd = parseTimeToMinutes(bHours?.[1] ?? null) ?? Number.MAX_SAFE_INTEGER;
  if (aEnd !== bEnd) return aEnd - bEnd;

  const aName = singularize(a.profiles)?.full_name ?? "";
  const bName = singularize(b.profiles)?.full_name ?? "";
  return aName.localeCompare(bName);
}

export default async function StaffSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonthInClinicTZ();

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, working_hours, profiles(full_name)")
    .eq("active", true);

  const weeks = getMonthGrid(month);
  const today = todayInClinicTZ();

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="p-8">
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

      <p className="text-xs text-gray-400 mb-4">
        Shows the recurring weekly schedule — there&apos;s no way yet to mark someone off for a
        single day, so the same pattern repeats every week.
      </p>

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

            const dayKey = DAY_KEYS[dayIdx];
            const dayNumber = Number(date.slice(-2));
            const onDuty = (staff || [])
              .filter((s) => s.working_hours?.[dayKey])
              .sort((a, b) => compareStaffByShift(a, b, dayKey));
            const groupedOnDuty = onDuty.reduce<Record<string, StaffMember[]>>((groups, staffMember) => {
              const groupLabel = getShiftGroup(staffMember.working_hours?.[dayKey]);
              groups[groupLabel] = [...(groups[groupLabel] ?? []), staffMember];
              return groups;
            }, {});
            const groupLabels = ["Morning shifts", "Afternoon shifts", "Other shifts"];
            const isToday = date === today;

            return (
              <Link
                key={date}
                href={`/dashboard/calendar?date=${date}`}
                className={`border-b border-r min-h-24 p-1.5 hover:bg-gray-50 ${isToday ? "bg-blue-50" : ""}`}
              >
                <p className={`text-xs mb-1 ${isToday ? "font-semibold text-blue-700" : "text-gray-500"}`}>
                  {dayNumber}
                </p>
                <div className="space-y-0.5">
                  {groupLabels.map((groupLabel) => {
                    const group = groupedOnDuty[groupLabel];
                    if (!group?.length) return null;

                    return (
                      <div key={groupLabel} className="space-y-0.5">
                        {Object.keys(groupedOnDuty).length > 1 && (
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">
                            {groupLabel}
                          </p>
                        )}
                        {group.map((s) => {
                          const profile = singularize(s.profiles);
                          const hours = formatShift(s.working_hours?.[dayKey]);

                          return (
                            <div
                              key={`${s.id}-${dayKey}`}
                              className="flex items-center justify-between gap-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800"
                            >
                              <span className="truncate font-medium">{profile?.full_name}</span>
                              <span className="shrink-0 text-right text-[10px] font-semibold text-blue-700">
                                {hours ?? "No hours"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {onDuty.length === 0 && <p className="text-xs text-gray-300">—</p>}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
