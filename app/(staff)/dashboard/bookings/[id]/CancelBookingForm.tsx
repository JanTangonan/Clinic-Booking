"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, type CancellationReason } from "../actions";

const REASONS: { value: CancellationReason; label: string }[] = [
  { value: "client_request", label: "Client requested cancellation" },
  { value: "rescheduled", label: "Rescheduled to another time" },
  { value: "staff_unavailable", label: "Staff unavailable" },
  { value: "clinic_closed", label: "Clinic closed" },
  { value: "no_show", label: "Client did not show up" },
  { value: "other", label: "Other" },
];

export default function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason>("client_request");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking({ booking_id: bookingId, reason, note });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700"
      >
        Cancel this booking
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as CancellationReason)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {reason === "other" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
            placeholder="Briefly explain..."
          />
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Cancelling..." : "Confirm cancellation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Never mind
        </button>
      </div>
    </div>
  );
}
