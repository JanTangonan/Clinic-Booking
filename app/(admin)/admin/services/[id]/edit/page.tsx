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
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Edit service</h1>
      <form action={updateWithId} className="space-y-4">
        <Field label="Name" name="name" defaultValue={service.name} required />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={service.description ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Save changes
        </button>
      </form>
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
