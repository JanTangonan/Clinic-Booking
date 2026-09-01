import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "./BookingForm";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  const supabase = await createClient();

  if (!client_id) {
    return (
      <div className="p-8">
        <p className="text-gray-600">
          No client selected.{" "}
          <Link href="/dashboard/clients" className="underline">
            Pick one from the client list
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const [{ data: client }, { data: services }] = await Promise.all([
    supabase.from("clients").select("id, full_name").eq("id", client_id).single(),
    supabase.from("services").select("id, name, duration_minutes, price").eq("active", true).order("name"),
  ]);

  if (!client) {
    return <div className="p-8 text-gray-600">Client not found.</div>;
  }

  if (!services?.length) {
    return (
      <div className="p-8 text-gray-600">
        No active services yet.{" "}
        <Link href="/admin/services" className="underline">
          Add one in Admin → Services
        </Link>{" "}
        before booking.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            New appointment
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create a booking</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a service, staff member, and time slot for {client.full_name}.
          </p>
        </div>

        <Link
          href={`/dashboard/clients/${client.id}`}
          className="inline-flex items-center text-sm font-medium text-slate-700 underline underline-offset-4"
        >
          ← Back to profile
        </Link>
      </div>

      <BookingForm clientId={client.id} services={services} />
    </div>
  );
}
