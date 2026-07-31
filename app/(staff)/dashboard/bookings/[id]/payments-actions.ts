"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function recordPayment(bookingId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") || "cash");

  if (!amount || amount <= 0) {
    throw new Error("Enter a valid amount");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("services(price)")
    .eq("id", bookingId)
    .single();

  const service = Array.isArray(booking?.services) ? booking.services[0] : booking?.services;
  const price = service?.price ?? 0;

  const { data: existingPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("booking_id", bookingId)
    .eq("status", "paid");

  const alreadyPaid = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = price - alreadyPaid;

  if (remaining <= 0) {
    throw new Error("This booking is already fully paid — nothing left to record.");
  }

  if (amount > remaining) {
    throw new Error(`That exceeds the remaining balance of ₱${remaining}.`);
  }

  // Recorded as 'paid' immediately — staff is logging money they've
  // already physically received, not initiating a pending transaction.
  // If you ever need a "logged but not yet verified" step (e.g. a
  // receptionist logs it, someone else confirms at day's end), this
  // is the one line that would change to status: 'pending'.
  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    amount,
    method,
    status: "paid",
    recorded_by: user?.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`);
}
