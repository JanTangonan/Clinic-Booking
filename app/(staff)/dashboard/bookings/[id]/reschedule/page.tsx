import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RescheduleForm from "./RescheduleForm";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, start_time, staff_id, service_id, clients(full_name), services(name), staff_details(profiles(full_name))"
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  // Only pending/confirmed bookings can be moved — a cancelled or
  // completed booking has nothing to reschedule.
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    redirect(`/dashboard/bookings/${id}`);
  }

  const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const staffDetails = Array.isArray(booking.staff_details) ? booking.staff_details[0] : booking.staff_details;
  const staffProfile = Array.isArray(staffDetails?.profiles) ? staffDetails.profiles[0] : staffDetails?.profiles;

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-semibold mb-1">Reschedule booking</h1>
      <p className="text-gray-500 mb-1">
        {client?.full_name} — {service?.name} with {staffProfile?.full_name}
      </p>
      <p className="text-gray-400 text-sm mb-6">
        Currently: {new Date(booking.start_time).toLocaleString()}
      </p>

      <RescheduleForm
        bookingId={booking.id}
        staffId={booking.staff_id}
        serviceId={booking.service_id}
        currentStartTime={booking.start_time}
      />

      <Link href={`/dashboard/bookings/${id}`} className="mt-6 inline-block text-sm underline">
        ← Cancel, keep current time
      </Link>
    </div>
  );
}
