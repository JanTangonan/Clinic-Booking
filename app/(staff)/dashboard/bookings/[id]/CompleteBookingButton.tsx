"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markBookingCompleted } from "../actions";

export default function CompleteBookingButton({ bookingId }: { bookingId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await markBookingCompleted(bookingId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleComplete}
        disabled={isPending}
        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Mark as completed"}
      </button>
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
