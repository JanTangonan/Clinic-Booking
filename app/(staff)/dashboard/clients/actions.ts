"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!full_name) {
    // In a real form you'd surface this back to the client; keeping
    // it simple for now since the input is marked required in the UI.
    throw new Error("Full name is required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create client: ${error.message}`);
  }

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${data.id}`);
}
