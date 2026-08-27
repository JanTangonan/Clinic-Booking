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

  const privacyConsent = String(formData.get("privacy_consent") || "") === "true";
  const privacyConsentSignature = String(formData.get("privacy_consent_signature") || "").trim();
  const privacyConsentVersion = String(formData.get("privacy_consent_version") || "").trim();


  if (!full_name) {
    // In a real form you'd surface this back to the client; keeping
    // it simple for now since the input is marked required in the UI.
    throw new Error("Full name is required");
  }

  if (!privacyConsent || !privacyConsentSignature) {
    throw new Error("Client must agree to the data privacy agreement and sign before saving.");
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
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
      privacy_consent_version: privacyConsentVersion || null,
      privacy_consent_signature: privacyConsentSignature,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create client: ${error.message}`);
  }

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${data.id}`);
}

export async function updateClientRecord(clientId: string, formData: FormData) {
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!full_name) {
    throw new Error("Full name is required");
  }

  const { error } = await supabase
    .from("clients")
    .update({
      full_name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
    })
    .eq("id", clientId);

  if (error) {
    throw new Error(`Could not update client: ${error.message}`);
  }

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}`);
}