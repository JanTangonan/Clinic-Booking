import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/auth/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <nav className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-medium">Admin</span>
          <a href="/admin/services" className="text-sm text-gray-600 hover:text-black">
            Services
          </a>
          <a href="/admin/staff" className="text-sm text-gray-600 hover:text-black">
            Staff
          </a>
          <a href="/admin/reports" className="text-sm text-gray-600 hover:text-black">
            Reports
          </a>
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-black">
            ← Dashboard
          </a>
        </div>
        <SignOutButton />
      </nav>
      <main>{children}</main>
    </div>
  );
}
