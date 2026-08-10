// Utilities for working with plain "YYYY-MM-DD" calendar dates without
// accidentally drifting a day due to timezone conversion.
//
// The bug this exists to prevent: `new Date(dateStr).toISOString()`
// looks correct but silently converts through UTC. For any timezone
// ahead of UTC (like Asia/Manila, UTC+8), a local midnight can still
// read as "yesterday" in UTC — shifting dates by one when you didn't
// ask for it. Every function here does date-only math in UTC-space
// consistently, so no conversion ever happens.

export const CLINIC_TIMEZONE = "Asia/Manila";

// Today's date as the clinic sees it, regardless of what timezone the
// server or the visiting browser happens to be running in.
export function todayInClinicTZ(): string {
  // en-CA locale formats as YYYY-MM-DD, which saves a manual join.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Shifts a "YYYY-MM-DD" string by N days (negative to go back).
// Pure UTC in, UTC math, UTC out — never touches local time, so no
// conversion drift is possible.
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

// Current month as "YYYY-MM", clinic-timezone-correct.
export function currentMonthInClinicTZ(): string {
  return todayInClinicTZ().slice(0, 7);
}

// Shifts a "YYYY-MM" string by N months (negative to go back).
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Builds a standard month-grid calendar: an array of weeks, each week
// an array of 7 cells (Sun–Sat), where each cell is either a
// "YYYY-MM-DD" date string or null for the padding days before the
// 1st / after the last day of the month.
export function getMonthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const startDay = firstOfMonth.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}