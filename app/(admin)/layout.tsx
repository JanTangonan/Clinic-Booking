import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/auth/SignOutButton";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/staff-schedule", label: "Schedule" },
];

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
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                A
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">Clinic Admin</span>
                <span className="block text-xs text-slate-500">Operations workspace</span>
              </span>
            </Link>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 lg:hidden">
              Admin
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ← Staff dashboard
            </Link>
            <span className="hidden rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 lg:inline-flex">
              Admin
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 lg:px-6">{children}</main>
    </div>
  );
}
