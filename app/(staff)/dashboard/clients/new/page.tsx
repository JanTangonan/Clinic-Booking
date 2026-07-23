import { createClientRecord } from "../actions";

export default function NewClientPage() {
  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Add client</h1>

      {/* Passing a server action directly as the form action means no
          client-side JS, no API route, no manual fetch — Next.js
          handles the submission and re-renders with fresh data. */}
      <form action={createClientRecord} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Full name *
          </label>
          <input
            id="full_name"
            name="full_name"
            required
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
            placeholder="General notes — allergies to be aware of, preferences, etc. Not clinical treatment notes."
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-black py-2 text-white"
        >
          Save client
        </button>
      </form>
    </div>
  );
}
