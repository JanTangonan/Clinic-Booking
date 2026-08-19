import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage() {
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, active, profiles(full_name, role)")
    .order("id");

  const totalStaff = staff?.length ?? 0;
  const activeStaff = staff?.filter((member) => member.active).length ?? 0;
  const adminCount = staff?.filter((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    return profile?.role === "admin";
  }).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Team management
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage account access and keep your clinic team organized.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/staff-schedule"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            View schedule
          </Link>
          <Link
            href="/admin/staff/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            + Add staff
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total team</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{totalStaff}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Active now</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-900">{activeStaff}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Admins</p>
          <p className="mt-3 text-2xl font-semibold text-violet-900">{adminCount}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {staff?.map((s) => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? "S";

          return (
            <div
              key={s.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {initial}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{profile?.full_name}</p>
                    {profile?.role === "admin" && (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile?.role === "admin" ? "Full access" : "Staff account"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
                <Link
                  href={`/admin/staff/${s.id}/edit`}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  Edit profile
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {staff?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No staff accounts yet. Add your first team member to get started.
        </div>
      )}
    </div>
  );
}
