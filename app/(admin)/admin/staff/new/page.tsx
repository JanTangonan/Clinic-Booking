import { createStaffAccount } from "../actions";

export default function NewStaffPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Staff access
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Add staff account</h1>
        <p className="mt-1 text-sm text-slate-600">
          This creates a real login. You&apos;ll receive a temporary password on the next screen and can share it directly with the staff member.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form action={createStaffAccount} className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="e.g. Ana Cruz"
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
                  required
                  placeholder="e.g. ana@clinic.com"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="staff"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">The account will be active once created.</p>
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
