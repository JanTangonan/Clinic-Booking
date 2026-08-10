import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/auth/SignOutButton";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/calendar", label: "Calendar" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
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

  if (!profile || !["staff", "admin"].includes(profile.role)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Clinic Dashboard</p>
              <p className="text-xs text-slate-500">Staff workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <SignOutButton />
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 lg:px-6">{children}</main>
    </div>
  );
}
