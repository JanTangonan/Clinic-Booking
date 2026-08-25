import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOT_INCREMENT_MIN = 60;

const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 13;

const DEFAULT_CLINIC_HOURS: [string, string] = ["09:00", "20:00"];

function toMinutes(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

// GET /api/availability?staff_id=...&service_id=...&date=YYYY-MM-DD
// Returns { slots: string[] } — ISO start times the staff member is
// free for the full duration of the service.
//
// This is UX only. The real guarantee against double-booking is the
// Postgres exclusion constraint on `bookings` — this endpoint can be
// slightly stale between when it runs and when the booking is actually
// submitted (someone else could grab the same slot in between), so
// createBooking() still has to handle that race on insert.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id") || null;
  const serviceId = searchParams.get("service_id");
  const dateStr = searchParams.get("date");
  const excludeBookingId = searchParams.get("exclude_booking_id");

  if ( !serviceId || !dateStr) {
    return NextResponse.json(
      { error: "service_id and date are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: service, error: serviceErr } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  if (serviceErr || !service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  let dayStart: Date;
  let dayEnd: Date;

  // No shift row for this staff member on this date = not scheduled
  // to work at all, regardless of what day of the week it is.
  if (staffId) {
    const { data: shift } = await supabase
      .from("staff_shifts")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .eq("shift_date", dateStr)
      .maybeSingle();

    if (!shift) return NextResponse.json({ slots: [], occupiedSlots: [] });

    dayStart = new Date(`${dateStr}T${shift.start_time}`);
    dayEnd = new Date(`${dateStr}T${shift.end_time}`);
  } else {
    // No specific staff yet — allow anywhere within the day's overall
    // scheduled hours (earliest shift start to latest shift end).
    const { data: allShifts } = await supabase
      .from("staff_shifts")
      .select("start_time, end_time")
      .eq("shift_date", dateStr);

    if (!allShifts || allShifts.length === 0) {
      dayStart = new Date(`${dateStr}T${DEFAULT_CLINIC_HOURS[0]}:00`);
      dayEnd = new Date(`${dateStr}T${DEFAULT_CLINIC_HOURS[1]}:00`);
    } else {
      const starts = allShifts.map((s) => toMinutes(s.start_time));
      const ends = allShifts.map((s) => toMinutes(s.end_time));
      dayStart = new Date(`${dateStr}T00:00:00`);
      dayStart.setMinutes(Math.min(...starts));
      dayEnd = new Date(`${dateStr}T00:00:00`);
      dayEnd.setMinutes(Math.max(...ends));
    }
  }

  const durationMs = service.duration_minutes * 60_000;

  const lunchStart = new Date(`${dateStr}T12:00:00`);
  const lunchEnd = new Date(`${dateStr}T13:00:00`);

  // Only relevant when a specific staff is chosen — used to flag
  // (not filter) already-booked times for that person.
  let existing: { start_time: string; end_time: string }[] = [];
  if (staffId) {
    let existingQuery = supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
      .in("status", ["pending", "confirmed", "completed"]);

    if (excludeBookingId) {
      existingQuery = existingQuery.neq("id", excludeBookingId);
    }

    const { data } = await existingQuery;
    existing = data || [];
  }

  const busy = (existing || []).map((b) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time).getTime(),
  }));

  const now = Date.now();
  const slots: string[] = [];
  const occupiedSlots: string[] = [];

  for (
    let t = dayStart.getTime();
    t + durationMs <= dayEnd.getTime();
    t += SLOT_INCREMENT_MIN * 60_000
  ) {
    if (t < now) continue; // don't offer times already in the past today

    const slotEnd = t + durationMs;

    const overlapsLunch =
      t < lunchEnd.getTime() &&
      slotEnd > lunchStart.getTime();

    if (overlapsLunch) continue;

    const iso = new Date(t).toISOString();
    slots.push(iso);

    const overlapsExisting = busy.some((b) => t < b.end && slotEnd > b.start);
    if (overlapsExisting) occupiedSlots.push(iso);
  }

  return NextResponse.json({ slots, occupiedSlots });
}
