import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-sky-50 px-6 py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-900">
              C
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
              Clinic workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">
              Keep every appointment moving smoothly.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Manage bookings, clients, schedules, and your team from one focused workspace.
            </p>
          </div>
          <p className="text-xs text-slate-400">Secure access for clinic staff and administrators.</p>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
              C
            </div>
          </div>
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Welcome back</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Staff sign in</h1>
            <p className="mt-2 text-sm text-slate-600">Use your clinic account to continue.</p>
          </div>
          {/* Suspense is required here because LoginForm reads useSearchParams(). */}
          <Suspense fallback={<p className="text-sm text-slate-500">Loading sign-in...</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
