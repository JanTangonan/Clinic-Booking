import { createClientRecord } from "../actions";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Client profile
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Add a new client</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a profile so future bookings and notes stay organized in one place.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {/* Passing a server action directly as the form action means no
            client-side JS, no API route, no manual fetch — Next.js
            handles the submission and re-renders with fresh data. */}
        <form action={createClientRecord} className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
                  Full name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="e.g. Maria Santos"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  placeholder="e.g. 0917 123 4567"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. maria@email.com"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="General notes — allergies to be aware of, preferences, etc. Not clinical treatment notes."
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              Optional details that help the team provide a better experience.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Required fields are marked with an asterisk.</p>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Save client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
