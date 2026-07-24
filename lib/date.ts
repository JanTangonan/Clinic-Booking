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
