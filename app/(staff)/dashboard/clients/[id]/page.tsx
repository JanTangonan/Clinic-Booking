import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 border-amber-400 text-amber-900",
  confirmed: "bg-blue-100 border-blue-400 text-blue-900",
  completed: "bg-green-100 border-green-400 text-green-700",
  cancelled: "bg-red-50 border-red-200 text-red-400 line-through",
  no_show: "bg-red-50 border-red-200 text-red-400 line-through",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, phone, email, notes, created_at")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_time, status, services(name), staff_details(id, profiles(full_name))")
    .eq("client_id", id)
    .order("start_time", { ascending: false });

  const initial = client.full_name?.charAt(0)?.toUpperCase() ?? "C";
  const bookingCount = bookings?.length ?? 0;

  const { data: logs } = await supabase
    .from("treatment_logs")
    .select("id, notes, created_at, staff:staff_id(full_name), booking:booking_id(start_time, services(name))")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-sm">
            {initial}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Client profile
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">{client.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
              <span>{client.phone || "No phone number"}</span>
              {client.phone && client.email && <span className="text-slate-300">|</span>}
              <span>{client.email || "No email on file"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Edit
          </Link>
          <Link
            href={`/dashboard/clients/${client.id}/log/new`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Add note
          </Link>
          <Link
            href={`/dashboard/bookings/new?client_id=${client.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            New booking
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900">At a glance</p>
              <p className="mt-1 text-sm text-slate-600">The details your team uses most often.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Contact</p>
                <p className="mt-1 font-medium text-slate-900">{client.phone || "No phone number"}</p>
                <p className="text-sm text-slate-600">{client.email || "No email on file"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Bookings</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{bookingCount}</p>
                <p className="text-sm text-slate-600">Total appointments on record</p>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{client.notes}</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Bookings</p>
                <p className="text-sm text-slate-600">Recent appointments for this client</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {bookingCount} total
              </span>
            </div>

            <ul className="divide-y divide-slate-200">
              {bookings?.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/bookings/${b.id}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {/* @ts-expect-error -- services/staff_details come back as arrays from the join; fine for a placeholder render */}
                      <p className="font-medium text-slate-900">{b.services?.name || "Appointment"}</p>
                      <p className="text-sm text-slate-500">{formatDateTime(b.start_time)}</p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm capitalize ${STATUS_STYLE[b.status] ?? "bg-gray-100 border-gray-300 text-gray-700"}`}>
                      {b.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {bookings?.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No bookings yet for this client.
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Quick info</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Joined</p>
              <p className="mt-1 font-medium text-slate-900">
                {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(client.created_at))}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Next step</p>
              <p className="mt-1 font-medium text-slate-900">Create a new booking for this client when needed.</p>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Treatment history</h2>
            <p className="mt-1 text-sm text-slate-600">Notes and context from previous visits.</p>
          </div>
          <span className="text-sm text-slate-500">{logs?.length ?? 0} notes</span>
        </div>
        <div className="space-y-3">
          {logs?.map((log) => {
          const staff = Array.isArray(log.staff) ? log.staff[0] : log.staff;
          const booking = Array.isArray(log.booking) ? log.booking[0] : log.booking;
          const bookingService = booking
            ? Array.isArray(booking.services)
              ? booking.services[0]
              : booking.services
            : null;

          return (
            <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-800">{staff?.full_name || "Staff member"}</span>
                <span className="text-slate-500">{formatDateTime(log.created_at)}</span>
              </div>
              {booking && (
                <p className="mb-2 text-xs text-slate-500">
                  Related to: {bookingService?.name} on {new Date(booking.start_time).toLocaleDateString()}
                </p>
              )}
              {log.notes && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{log.notes}</p>}
            </div>
          );
          })}
        </div>

        {logs?.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No treatment notes yet.
          </div>
        )}
      </section>
    </div>
  );
}
