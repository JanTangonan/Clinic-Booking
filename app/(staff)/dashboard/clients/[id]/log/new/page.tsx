import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTreatmentLog } from "../actions";

export default async function NewTreatmentLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from("clients").select("id, full_name").eq("id", id).single();
  if (!client) notFound();

  // Recent bookings for this client, so staff can optionally link the
  // note to the specific visit it's about — helpful later when
  // reviewing "what happened at the March 3rd appointment."
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_time, services(name)")
    .eq("client_id", id)
    .order("start_time", { ascending: false })
    .limit(10);

  const createLogForClient = createTreatmentLog.bind(null, client.id);

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Client note
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add treatment note</h1>
          <p className="mt-1 text-sm text-slate-600">Keep a clear record for {client.full_name}.</p>
        </div>

        <Link
          href={`/dashboard/clients/${client.id}`}
          className="inline-flex items-center text-sm font-medium text-slate-700 underline underline-offset-4"
        >
          ← Back to profile
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Client:</span> {client.full_name}
        </div>

        <form action={createLogForClient} className="space-y-5">
          <div>
            <label htmlFor="booking_id" className="block text-sm font-medium text-slate-700">
              Related booking <span className="text-slate-400">(optional)</span>
            </label>
            <select
              id="booking_id"
              name="booking_id"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="">None</option>
              {bookings?.map((b) => {
                const service = Array.isArray(b.services) ? b.services[0] : b.services;
                return (
                  <option key={b.id} value={b.id}>
                    {new Date(b.start_time).toLocaleDateString()} — {service?.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={6}
              placeholder="Products used, skin reaction, recommendations for next visit..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Save note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
