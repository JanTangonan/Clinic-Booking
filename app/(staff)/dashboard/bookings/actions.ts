"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CreateBookingInput = {
  client_id: string;
  staff_id: string | null; // null = unassigned, assign later
  service_id: string;
  start_time: string; // ISO
};

export async function createBooking(input: CreateBookingInput) {
  const supabase = await createClient();

  const { data: service, error: serviceErr } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", input.service_id)
    .single();

  if (serviceErr || !service) {
    return { error: "Could not load service details." };
  }

  const start = new Date(input.start_time);
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: input.client_id,
      staff_id: input.staff_id,
      service_id: input.service_id,
      created_by: user?.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${input.client_id}`);
  redirect(`/dashboard/bookings/${data.id}`);
}

// Assigns (or reassigns, or unassigns via staffId = null) a staff
// member to an existing reservation. Deliberately allows assigning
// someone who already has an overlapping booking — no capacity check,
// per explicit decision that this is trusted to staff/admin judgment.
export async function assignStaffToBooking(bookingId: string, staffId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("bookings")
    .update({ staff_id: staffId })
    .eq("id", bookingId)
    .select("client_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_log").insert({
    actor_id: user?.id,
    action: staffId ? "staff_assigned" : "staff_unassigned",
    target_table: "bookings",
    target_id: bookingId,
  });

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/dashboard/clients/${data.client_id}`);
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

export type CancellationReason =
  | "client_request"
  | "rescheduled"
  | "staff_unavailable"
  | "clinic_closed"
  | "no_show"
  | "other";

export async function cancelBooking(input: {
  booking_id: string;
  reason: CancellationReason;
  note?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 'no_show' gets its own status (distinct from a normal cancellation)
  // so reporting can separate "client cancelled ahead of time" from
  // "client just didn't show up" — these usually drive different
  // policy decisions (e.g. requiring deposits going forward).
  const status = input.reason === "no_show" ? "no_show" : "cancelled";

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status,
      cancellation_reason: input.reason,
      cancellation_note: input.note || null,
      cancelled_by: user?.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", input.booking_id)
    .select("client_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_log").insert({
    actor_id: user?.id,
    action: `booking_${status}`,
    target_table: "bookings",
    target_id: input.booking_id,
  });

  revalidatePath(`/dashboard/bookings/${input.booking_id}`);
  revalidatePath(`/dashboard/clients/${data.client_id}`);
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

// Marks a booking as completed. This is a separate action from cancellation, 
// and is used to indicate that the appointment was fulfilled successfully.
export async function markBookingCompleted(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user?.id,
    })
    .eq("id", bookingId)
    .select("client_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_log").insert({
    actor_id: user?.id,
    action: "booking_completed",
    target_table: "bookings",
    target_id: bookingId,
  });

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/dashboard/clients/${data.client_id}`);
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

// Moves an EXISTING booking to a new time, rather than cancelling it
// and creating a new one. This matters because payments and treatment
// logs are linked to the booking's id — cancel-and-recreate would
// sever that history from what's actually happening with the client.
// Same booking id, same linked records, just a new start/end time.
export async function rescheduleBooking(bookingId: string, newStartTime: string) {
  const supabase = await createClient();

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("client_id, start_time, services(duration_minutes)")
    .eq("id", bookingId)
    .single();

  if (fetchErr || !booking) {
    return { error: "Could not load this booking." };
  }

  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const durationMinutes = service?.duration_minutes;

  if (!durationMinutes) {
    return { error: "Could not determine service duration." };
  }

  const start = new Date(newStartTime);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const { error } = await supabase
    .from("bookings")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_log").insert({
    actor_id: user?.id,
    action: "booking_rescheduled",
    target_table: "bookings",
    target_id: bookingId,
    details: { old_start_time: booking.start_time, new_start_time: start.toISOString() },
  });

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/dashboard/clients/${booking.client_id}`);
  revalidatePath("/dashboard/calendar");

  redirect(`/dashboard/bookings/${bookingId}`);
}