"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// Generates a temporary password for a new staff account. There's no
// email-based invite flow set up (that requires configuring Supabase's
// email provider), so the admin creates the login directly and shares
// this password with the staff member in person/by phone — consistent
// with how this clinic already operates (no self-service anything).
function generateTempPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6).toUpperCase();
}

export async function createStaffAccount(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "staff") as "staff" | "admin";

  if (!email || !fullName) {
    throw new Error("Email and name are required");
  }

  // Service role client — this is the one place in the app that's
  // allowed to bypass RLS, because creating an auth user isn't
  // something the anon/session-based client can do at all.
  const adminClient = await createServiceRoleClient();
  const tempPassword = generateTempPassword();

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // skip email verification — admin is vouching for this account
    user_metadata: { full_name: fullName },
  });

  if (authError || !authUser.user) {
    throw new Error(authError?.message || "Could not create account");
  }

  // The handle_new_user() trigger already inserted a `profiles` row
  // defaulting to role='staff' — update it if this should be admin.
  if (role === "admin") {
    await adminClient.from("profiles").update({ role: "admin" }).eq("id", authUser.user.id);
  }

  // Create the staff_details row with empty working hours — admin
  // fills those in on the edit page right after.
  await adminClient.from("staff_details").insert({
    id: authUser.user.id,
    working_hours: {},
    active: true,
  });

  revalidatePath("/admin/staff");
  redirect(`/admin/staff/${authUser.user.id}/edit?created=1&temp_password=${tempPassword}`);
}

export async function updateStaffDetails(input: {
  staffId: string;
  specialties: string[];
  active: boolean;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_details")
    .update({
      specialties: input.specialties,
      active: input.active,
    })
    .eq("id", input.staffId);

  if (error) return { error: error.message };

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${input.staffId}/edit`);
  return { success: true };
}
