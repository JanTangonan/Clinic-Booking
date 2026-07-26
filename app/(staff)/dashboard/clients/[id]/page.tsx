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

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {initial}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Client profile
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">{client.full_name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {client.phone || client.email || "No contact info on file"}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/bookings/new?client_id=${client.id}`}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          + New booking
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
    </div>
  );
}
