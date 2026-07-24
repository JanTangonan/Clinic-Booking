import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateService } from "../../actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, deposit_amount")
    .eq("id", id)
    .single();

  if (!service) notFound();

  // Bind the service id server-side so the form only needs to submit
  // its own fields — the action signature becomes (formData) => void
  // once bound, which is what a plain <form action={...}> expects.
  const updateWithId = updateService.bind(null, service.id);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Service setup
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Edit service</h1>
        <p className="mt-1 text-sm text-slate-600">
          Update the details for this treatment without changing the rest of your booking flow.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form action={updateWithId} className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Name" name="name" defaultValue={service.name} required />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={service.description ?? ""}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                />
              </div>
              <Field
                label="Duration (minutes)"
                name="duration_minutes"
                type="number"
                required
                defaultValue={String(service.duration_minutes)}
              />
              <Field label="Price (₱)" name="price" type="number" step="0.01" required defaultValue={String(service.price)} />
              <Field
                label="Deposit amount (₱)"
                name="deposit_amount"
                type="number"
                step="0.01"
                defaultValue={String(service.deposit_amount)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Any changes here will be reflected in upcoming bookings.</p>
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
      />
    </div>
  );
}
