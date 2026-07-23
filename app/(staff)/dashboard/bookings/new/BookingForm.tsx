"use client";

import { useEffect, useState, useTransition } from "react";
import { createBooking } from "../actions";

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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedStaff = staff.find((s) => s.id === staffId);
  const selectedLabel = selectedSlot
    ? new Date(selectedSlot).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Choose a time slot";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration_minutes}min — ₱{s.price}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Staff</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffName(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Available times</label>
              <span className="text-xs text-slate-500">{slots.length} options</span>
            </div>

            {loadingSlots && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Loading availability...
              </div>
            )}

            {!loadingSlots && slots.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No open slots this day — try another date.
              </div>
            )}

            {!loadingSlots && slots.length > 0 && (
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
                      className={`rounded-full border px-3 py-2 text-sm font-medium ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Booking summary</p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Service</p>
              <p className="mt-1 font-medium text-slate-900">
                {selectedService?.name ?? "Select a service"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Staff</p>
              <p className="mt-1 font-medium text-slate-900">
                {selectedStaff ? staffName(selectedStaff) : "Select a staff member"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Time</p>
              <p className="mt-1 font-medium text-slate-900">{selectedLabel}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!selectedSlot || isPending}
          onClick={handleConfirm}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Creating booking..." : "Confirm booking"}
        </button>
      </div>
    </div>
  );
}
