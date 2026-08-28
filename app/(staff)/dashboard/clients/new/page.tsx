import Link from "next/link";

import NewClientForm from "./NewClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Client profile
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add a new client</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create a profile so future bookings and notes stay organized in one place.
          </p>
        </div>

        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-sm font-medium text-slate-700 underline underline-offset-4"
        >
          ← Back to clients
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <NewClientForm />
      </div>
    </div>
  );
}
