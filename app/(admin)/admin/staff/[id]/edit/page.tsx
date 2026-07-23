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
    .select("id, active, specialties, working_hours, profiles(full_name, role)")
    .eq("id", id)
    .single();

  if (!staff) notFound();

  const profile = Array.isArray(staff.profiles) ? staff.profiles[0] : staff.profiles;

  return (
    <div className="p-8 max-w-md">
      {created === "1" && temp_password && (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">Account created</p>
          <p className="text-amber-800 mt-1">
            Temporary password: <code className="font-mono bg-white px-1.5 py-0.5 rounded">{temp_password}</code>
          </p>
          <p className="text-amber-700 text-xs mt-2">
            This is shown only once — share it with {profile?.full_name} now. They can change it later
            (password reset isn&apos;t built yet, so for now that also means asking you to reset it again).
          </p>
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-1">{profile?.full_name}</h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{profile?.role}</p>

      <StaffEditForm
        staffId={staff.id}
        initialWorkingHours={staff.working_hours || {}}
        initialSpecialties={staff.specialties || []}
        initialActive={staff.active}
      />
    </div>
  );
}
