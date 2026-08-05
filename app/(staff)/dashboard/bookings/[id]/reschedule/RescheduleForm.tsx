"use client";

import { useEffect, useState, useTransition } from "react";
import { rescheduleBooking } from "../../actions";
import { todayInClinicTZ } from "@/lib/date";

export default function RescheduleForm({
  bookingId,
  staffId,
  serviceId,
  currentStartTime,
}: {
  bookingId: string;
  staffId: string;
  serviceId: string;
  currentStartTime: string;
}) {
  const [date, setDate] = useState(() => currentStartTime.slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    fetch(
      `/api/availability?staff_id=${staffId}&service_id=${serviceId}&date=${date}&exclude_booking_id=${bookingId}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots || []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load availability. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, staffId, serviceId, bookingId]);

  function handleConfirm() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleBooking(bookingId, selectedSlot);
      // rescheduleBooking redirects on success, so reaching this line
      // means it returned an error instead.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700">New date</label>
        <input
          type="date"
          value={date}
          min={todayInClinicTZ()}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Available times</label>
        {loadingSlots && <p className="text-sm text-gray-500">Loading...</p>}
        {!loadingSlots && slots.length === 0 && (
          <p className="text-sm text-gray-500">No open slots this day — try another date.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => {
            const label = new Date(slot).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isSelected = slot === selectedSlot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  isSelected ? "bg-black text-white border-black" : "border-gray-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={!selectedSlot || isPending}
        onClick={handleConfirm}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Rescheduling..." : "Confirm new time"}
      </button>
    </div>
  );
}
