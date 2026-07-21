import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Path prefix -> roles allowed to access it.
// Anything not listed here (marketing pages, /book, /login, /signup,
// /services) is public and falls through untouched.
const PROTECTED_ROUTES: { prefix: string; roles: Array<"client" | "staff" | "admin"> }[] = [
  { prefix: "/portal", roles: ["client", "staff", "admin"] }, // any logged-in user
  { prefix: "/dashboard", roles: ["staff", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
];

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const matched = PROTECTED_ROUTES.find((r) => path.startsWith(r.prefix));
  if (!matched) {
    return response; // public route, nothing to check
  }

  // Not logged in at all -> bounce to login, remember where they were headed
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in — check their role against what this route group allows.
  // We look up role fresh from `profiles` rather than trusting a JWT
  // claim, so a role change (e.g. admin demotes a staff member) takes
  // effect immediately instead of waiting for token expiry.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (!role || !matched.roles.includes(role)) {
    // Logged in, but wrong role for this area — send them to their own
    // home rather than a bare 403, since a client hitting /dashboard is
    // more likely confused than malicious.
    const fallback = role === "admin" || role === "staff" ? "/dashboard" : "/portal";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
