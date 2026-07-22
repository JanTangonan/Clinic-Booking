import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-semibold mb-6">Staff Login</h1>
      {/* Suspense is required here because LoginForm reads useSearchParams(),
          which Next.js needs wrapped for pages that could be statically rendered. */}
      <Suspense fallback={<p>Loading...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
