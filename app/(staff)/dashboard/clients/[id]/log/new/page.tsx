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
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-1">Add treatment note</h1>
      <p className="text-gray-500 mb-6">for {client.full_name}</p>

      <form action={createLogForClient} className="space-y-4">
        <div>
          <label htmlFor="booking_id" className="block text-sm font-medium text-gray-700">
            Related booking (optional)
          </label>
          <select
            id="booking_id"
            name="booking_id"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            placeholder="Products used, skin reaction, recommendations for next visit..."
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Save note
        </button>
      </form>
    </div>
  );
}
