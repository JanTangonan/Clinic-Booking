import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage() {
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, active, profiles(full_name, role)")
    .order("id");

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <div className="flex gap-2">
          <Link href="/admin/staff-schedule" className="rounded border border-gray-300 px-4 py-2 text-sm">
            View schedule
          </Link>
          <Link href="/admin/staff/new" className="rounded bg-black px-4 py-2 text-sm text-white">
            + Add staff
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-gray-200">
        {staff?.map((s) => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;

          return (
            <li key={s.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {profile?.full_name}
                  {profile?.role === "admin" && (
                    <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                      admin
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-2 py-1 text-xs border ${
                    s.active ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 bg-gray-50 text-gray-500"
                  }`}
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
                <Link href={`/admin/staff/${s.id}/edit`} className="text-sm underline">
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {staff?.length === 0 && (
        <p className="text-gray-500 text-sm py-6 text-center">No staff accounts yet.</p>
      )}
    </div>
  );
}
