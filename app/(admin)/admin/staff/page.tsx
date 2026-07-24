import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage() {
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, active, working_hours, profiles(full_name, role)")
    .order("id");

  const activeCount = staff?.filter((member) => member.active).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Team management
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review team availability, roles, and account status from one place.
          </p>
        </div>
        <Link href="/admin/staff/new" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          + Add staff
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
          {activeCount} active staff member{activeCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-3">
        {staff?.map((s) => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const daysSet = Object.values(s.working_hours || {}).filter(Boolean).length;

          return (
            <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{profile?.full_name}</p>
                  {profile?.role === "admin" && (
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                      admin
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {daysSet > 0 ? `Working ${daysSet} day${daysSet === 1 ? "" : "s"}/week` : "No working hours set"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {s.active ? "Active" : "Inactive"}
                </span>
                <Link href={`/admin/staff/${s.id}/edit`} className="text-sm font-medium text-slate-700 underline underline-offset-4">
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {staff?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No staff accounts yet — add your first team member to get started.
        </div>
      )}
    </div>
  );
}
