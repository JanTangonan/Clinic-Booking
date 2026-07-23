import { createService } from "../actions";

export default function NewServicePage() {
  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Add service</h1>
      <form action={createService} className="space-y-4">
        <Field label="Name" name="name" required />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <Field label="Duration (minutes)" name="duration_minutes" type="number" required defaultValue="60" />
        <Field label="Price (₱)" name="price" type="number" step="0.01" required />
        <Field label="Deposit amount (₱)" name="deposit_amount" type="number" step="0.01" defaultValue="0" />
        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Save service
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
