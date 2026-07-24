import { createService } from "../actions";

export default function NewServicePage() {
  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Service setup
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Add a new service</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure the treatment details that staff will book and clients will see.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form action={createService} className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Name" name="name" required />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
                />
              </div>
              <Field label="Duration (minutes)" name="duration_minutes" type="number" required defaultValue="60" />
              <Field label="Price (₱)" name="price" type="number" step="0.01" required />
              <Field label="Deposit amount (₱)" name="deposit_amount" type="number" step="0.01" defaultValue="0" />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">These values will be used for availability and booking pricing.</p>
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              Save service
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
