"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createService(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("services").insert({
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    duration_minutes: Number(formData.get("duration_minutes")),
    price: Number(formData.get("price")),
    deposit_amount: Number(formData.get("deposit_amount") || 0),
    active: true,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function updateService(serviceId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("services")
    .update({
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      duration_minutes: Number(formData.get("duration_minutes")),
      price: Number(formData.get("price")),
      deposit_amount: Number(formData.get("deposit_amount") || 0),
    })
    .eq("id", serviceId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function toggleServiceActive(serviceId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ active }).eq("id", serviceId);
  if (error) return { error: error.message };
  revalidatePath("/admin/services");
  return { success: true };
}
