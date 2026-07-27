"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTreatmentLog(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notes = String(formData.get("notes") || "").trim();
  const bookingIdRaw = String(formData.get("booking_id") || "");
  const bookingId = bookingIdRaw || null;

  const { error } = await supabase.from("treatment_logs").insert({
    client_id: clientId,
    booking_id: bookingId,
    staff_id: user?.id,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}`);
}
