"use client";

import { useEffect, useState, useTransition } from "react";
import { createBooking } from "../actions";
import { todayInClinicTZ } from "@/lib/date";

type Service = { id: string; name: string; duration_minutes: number; price: number };
type StaffMember = { id: string; profiles: { full_name: string } | { full_name: string }[] | null };

function staffName(s: StaffMember) {
  const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
  return p?.full_name ?? "Unnamed staff";
}

export default function BookingForm({
  clientId,
  services,
  staff,
}: {
  clientId: string;
  services: Service[];
  staff: StaffMember[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(() => todayInClinicTZ());
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-fetch availability whenever any of the three inputs change.
  useEffect(() => {
    if (!serviceId || !staffId || !date) return;
    let cancelled = false;

    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    fetch(`/api/availability?staff_id=${staffId}&service_id=${serviceId}&date=${date}`)
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
  }, [serviceId, staffId, date]);

  function handleConfirm() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        client_id: clientId,
        staff_id: staffId,
        service_id: serviceId,
        start_time: selectedSlot,
      });
      // createBooking redirects on success, so reaching this line at
      // all means it returned an error instead.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700">Service</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes}min — ₱{s.price}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Staff</label>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {staffName(s)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
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
        {isPending ? "Booking..." : "Confirm booking"}
      </button>
    </div>
  );
}
