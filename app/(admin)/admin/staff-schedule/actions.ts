"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setStaffShift(staffId: string, date: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const start_time = String(formData.get("start_time") || "");
  const end_time = String(formData.get("end_time") || "");

  if (!start_time || !end_time) {
    throw new Error("Start and end time are required");
  }
  if (end_time <= start_time) {
    throw new Error("End time must be after start time");
  }

  // Upsert on (staff_id, shift_date) — the unique constraint from the
  // migration means this either creates today's shift or overwrites
  // the existing one, never creates a duplicate.
  const { error } = await supabase.from("staff_shifts").upsert(
    { staff_id: staffId, shift_date: date, start_time, end_time, created_by: user?.id },
    { onConflict: "staff_id,shift_date" }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/staff-schedule/${date}`);
  revalidatePath("/admin/staff-schedule");
  revalidatePath("/dashboard/calendar");
}

export async function removeStaffShift(staffId: string, date: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_shifts")
    .delete()
    .eq("staff_id", staffId)
    .eq("shift_date", date);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/staff-schedule/${date}`);
  revalidatePath("/admin/staff-schedule");
  revalidatePath("/dashboard/calendar");
}
