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
  staffId: string | null;
  serviceId: string;
  currentStartTime: string;
}) {
  const [date, setDate] = useState(() => currentStartTime.slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    const staffParam = staffId ? `&staff_id=${staffId}` : "";
    fetch(`/api/availability?service_id=${serviceId}&date=${date}${staffParam}&exclude_booking_id=${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setSlots(data.slots || []);
          setOccupiedSlots(data.occupiedSlots || []);
        }
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">New date</label>
        <input
          type="date"
          value={date}
          min={todayInClinicTZ()}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Available times</label>
          <span className="text-xs text-slate-500">Tap a time to select it</span>
        </div>

        {loadingSlots && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Loading availability...
          </div>
        )}

        {!loadingSlots && slots.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No open slots this day — try another date.
          </div>
        )}

        {!loadingSlots && slots.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
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
                  className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedSlot || isPending}
        onClick={handleConfirm}
        className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Rescheduling..." : "Confirm new time"}
      </button>
    </div>
  );
}
