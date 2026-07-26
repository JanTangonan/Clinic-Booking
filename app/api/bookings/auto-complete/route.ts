import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/bookings/auto-complete — meant to be hit by a scheduler,
// same pattern as /api/reminders. This is a safety net, not the
// primary path: staff should click "Mark as completed" right after a
// treatment (see CompleteBookingButton), since that's more accurate —
// a client could no-show or the appointment could run long. This job
// only catches whatever staff didn't close out manually, once the
// scheduled end time is well in the past.
//
// Runs an hour after end_time (not immediately) to avoid marking
// something "completed" while it's still realistically in progress.
const GRACE_PERIOD_MINUTES = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MINUTES * 60_000).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: null, // null = system, not a staff member — distinguishes from manual completion
    })
    .in("status", ["pending", "confirmed"])
    .lt("end_time", cutoff)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ auto_completed: data?.length ?? 0, ids: data?.map((b) => b.id) ?? [] });
}
