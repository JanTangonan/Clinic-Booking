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
    <div className="mt-4">
      <button
        type="button"
        onClick={handleComplete}
        disabled={isPending}
        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Mark as completed"}
      </button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
