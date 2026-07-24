import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ServiceActiveToggle from "./ServiceActiveToggle";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, deposit_amount, active")
    .order("name");

  const activeCount = services?.filter((service) => service.active).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Service catalog
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Services</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage the treatments available for booking and update pricing quickly.
          </p>
        </div>
        <Link href="/admin/services/new" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          + Add service
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
          {activeCount} active service{activeCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-3">
        {services?.map((s) => (
          <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{s.name}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {s.duration_minutes}min · ₱{s.price}
                {s.deposit_amount > 0 && ` · ₱${s.deposit_amount} deposit`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ServiceActiveToggle serviceId={s.id} active={s.active} />
              <Link href={`/admin/services/${s.id}/edit`} className="text-sm font-medium text-slate-700 underline underline-offset-4">
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>

      {services?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No services yet — add your first one to get started.
        </div>
      )}
    </div>
  );
}
