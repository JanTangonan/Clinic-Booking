import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOT_INCREMENT_MIN = 60;

const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 13;

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
  const staffId = searchParams.get("staff_id");
  const serviceId = searchParams.get("service_id");
  const dateStr = searchParams.get("date");
  const excludeBookingId = searchParams.get("exclude_booking_id");

  if (!staffId || !serviceId || !dateStr) {
    return NextResponse.json(
      { error: "staff_id, service_id, and date are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const [{ data: shift }, { data: service, error: serviceErr }] = await Promise.all([
    supabase
      .from("staff_shifts")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .eq("shift_date", dateStr)
      .maybeSingle(),
    supabase.from("services").select("duration_minutes").eq("id", serviceId).single(),
  ]);

  if (serviceErr || !service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // No shift row for this staff member on this date = not scheduled
  // to work at all, regardless of what day of the week it is.
  if (!shift) {
    return NextResponse.json({ slots: [] });
  }

  const dayStart = new Date(`${dateStr}T${shift.start_time}`);
  const dayEnd = new Date(`${dateStr}T${shift.end_time}`);
  const durationMs = service.duration_minutes * 60_000;

  const lunchStart = new Date(`${dateStr}T12:00:00`);
  const lunchEnd = new Date(`${dateStr}T13:00:00`);

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

  const { data: existing } = await existingQuery;

  const busy = (existing || []).map((b) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time).getTime(),
  }));

  const now = Date.now();
  const slots: string[] = [];

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

    const overlapsExisting = busy.some((b) => t < b.end && slotEnd > b.start);
    if (!overlapsExisting) slots.push(new Date(t).toISOString());
  }

  return NextResponse.json({ slots });
}
