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
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Reschedule appointment</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Choose a new time</h1>
        <p className="mt-2 text-sm text-slate-600">
          {client?.full_name} • {service?.name} with {staffProfile?.full_name}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Current time: {new Date(booking.start_time).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <RescheduleForm
          bookingId={booking.id}
          staffId={booking.staff_id}
          serviceId={booking.service_id}
          currentStartTime={booking.start_time}
        />

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Booking details</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div>
              <p className="font-medium text-slate-900">Client</p>
              <p>{client?.full_name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Service</p>
              <p>{service?.name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Staff</p>
              <p>{staffProfile?.full_name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Current time</p>
              <p>{new Date(booking.start_time).toLocaleString()}</p>
            </div>
          </div>

          <Link
            href={`/dashboard/bookings/${id}`}
            className="mt-6 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Keep current time
          </Link>
        </aside>
      </div>
    </div>
  );
}
