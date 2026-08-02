import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateClientRecord } from "../../actions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, phone, email, notes")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const updateWithId = updateClientRecord.bind(null, client.id);

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Edit client</h1>

      <form action={updateWithId} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Full name *
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={client.full_name}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={client.phone ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={client.email ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            placeholder="General notes — allergies to be aware of, preferences, etc. Not clinical treatment notes."
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Save changes
        </button>
      </form>
    </div>
  );
}
