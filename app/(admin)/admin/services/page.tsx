import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ServiceActiveToggle from "./ServiceActiveToggle";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, deposit_amount, active")
    .order("name");

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Services</h1>
        <Link href="/admin/services/new" className="rounded bg-black px-4 py-2 text-sm text-white">
          + Add service
        </Link>
      </div>

      <ul className="divide-y divide-gray-200">
        {services?.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500">
                {s.duration_minutes}min · ₱{s.price}
                {s.deposit_amount > 0 && ` · ₱${s.deposit_amount} deposit`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ServiceActiveToggle serviceId={s.id} active={s.active} />
              <Link href={`/admin/services/${s.id}/edit`} className="text-sm underline">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {services?.length === 0 && (
        <p className="text-gray-500 text-sm py-6 text-center">No services yet — add your first one.</p>
      )}
    </div>
  );
}
