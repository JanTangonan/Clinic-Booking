import { createStaffAccount } from "../actions";

export default function NewStaffPage() {
  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-2">Add staff account</h1>
      <p className="text-sm text-gray-500 mb-6">
        This creates a real login. You&apos;ll get a temporary password on the next screen —
        share it with the staff member directly (in person or by phone).
      </p>
      <form action={createStaffAccount} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
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
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="staff"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Create account
        </button>
      </form>
    </div>
  );
}
