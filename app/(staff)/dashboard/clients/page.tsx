import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, full_name, phone, email, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: clients, error } = await query;
  const totalClients = clients?.length ?? 0;
  const withContactInfo = clients?.filter((client) => client.phone || client.email).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Client directory
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-600">
            Keep each client profile close at hand and jump into their booking history quickly.
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Add client
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name or phone..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none ring-0"
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Search
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {q ? `Showing ${totalClients} result${totalClients === 1 ? "" : "s"} for “${q}”` : `Showing ${totalClients} client${totalClients === 1 ? "" : "s"}`}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {withContactInfo} with contact details
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Error loading clients: {error.message}
        </div>
      )}

      <div className="grid gap-3">
        {clients?.map((client) => {
          const initial = client.full_name?.charAt(0)?.toUpperCase() ?? "C";

          return (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {initial}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{client.full_name}</p>
                  <p className="text-sm text-slate-600">
                    {client.phone || client.email || "No contact info"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500 sm:justify-end">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Joined {formatDate(client.created_at)}
                </span>
                <span className="text-slate-400">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {clients?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          {q ? `No clients match “${q}” yet.` : "No clients yet — add your first one to get started."}
        </div>
      )}
    </div>
  );
}
