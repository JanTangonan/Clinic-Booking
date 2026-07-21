import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Middleware already blocks unauthenticated/wrong-role requests before
// they get here. This check is a deliberate second layer — defense in
// depth — in case this layout is ever reached via a path middleware's
// matcher doesn't cover, or middleware is misconfigured later.
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div>
      {/* Client portal nav: My Bookings, History, Profile */}
      <main>{children}</main>
    </div>
  );
}
