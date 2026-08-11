import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffEditForm from "./StaffEditForm";

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; temp_password?: string }>;
}) {
  const { id } = await params;
  const { created, temp_password } = await searchParams;
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, active, specialties, profiles(full_name, role)")
    .eq("id", id)
    .single();

  if (!staff) notFound();

  const profile = Array.isArray(staff.profiles) ? staff.profiles[0] : staff.profiles;

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      {created === "1" && temp_password && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm shadow-sm">
          <p className="font-semibold text-amber-900">Account created</p>
          <p className="mt-1 text-amber-800">
            Temporary password: <span className="rounded bg-white px-2 py-0.5 font-mono">{temp_password}</span>
          </p>
          <p className="mt-2 text-xs text-amber-700">
            This is shown only once — share it with {profile?.full_name} now. They can change it later.
          </p>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Staff profile
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">{profile?.full_name}</h1>
        <p className="mt-1 text-sm text-slate-600 capitalize">{profile?.role}</p>
      </div>

      <StaffEditForm
        staffId={staff.id}
        initialSpecialties={staff.specialties || []}
        initialActive={staff.active}
      />
    </div>
  );
}
