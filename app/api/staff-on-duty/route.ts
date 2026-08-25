import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/staff-on-duty?date=YYYY-MM-DD
// Returns { staff: [{ id, full_name }] } — only staff with an actual
// shift that date, not the entire roster. Used to populate "who can
// this reservation be assigned to" pickers, since assigning someone
// who isn't even scheduled to work that day wouldn't make sense.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from("staff_shifts")
    .select("staff_id, staff_details(profiles(full_name))")
    .eq("shift_date", date);

  const staff = (shifts || []).map((s) => {
    const details = Array.isArray(s.staff_details) ? s.staff_details[0] : s.staff_details;
    const profile = Array.isArray(details?.profiles) ? details.profiles[0] : details?.profiles;
    return { id: s.staff_id, full_name: profile?.full_name ?? "Staff" };
  });

  return NextResponse.json({ staff });
}
