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
        {/* TODO: Services, Staff, Payments, Settings links */}
        <span className="font-medium">Admin</span>
        <SignOutButton />
      </nav>
      <main>{children}</main>
    </div>
  );
}
