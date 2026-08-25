"use client";

import { useEffect, useState, useTransition } from "react";
import { createBooking } from "../actions";
import { todayInClinicTZ } from "@/lib/date";

type Service = { id: string; name: string; duration_minutes: number; price: number };
type StaffOption = { id: string; full_name: string };

const UNASSIGNED = "";

export default function BookingForm({
  clientId,
  services,
}: {
  clientId: string;
  services: Service[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string>(UNASSIGNED);
  const [date, setDate] = useState(() => todayInClinicTZ());

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [slots, setSlots] = useState<string[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Who's actually scheduled that day — re-fetched whenever the date
  // changes. Staff assignment is optional, but if you DO pick someone,
  // it should only be someone actually working that date.
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoadingStaff(true);

    fetch(`/api/staff-on-duty?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setStaffOptions(data.staff || []);
          // If the previously selected staff isn't working this new
          // date, fall back to Unassigned rather than silently
          // keeping an invalid selection.
          setStaffId((prev) => (data.staff?.some((s: StaffOption) => s.id === prev) ? prev : UNASSIGNED));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStaff(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;

    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    const staffParam = staffId ? `&staff_id=${staffId}` : "";
    fetch(`/api/availability?service_id=${serviceId}&date=${date}${staffParam}`)
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
  }, [serviceId, staffId, date]);

  function handleConfirm() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        client_id: clientId,
        staff_id: staffId || null,
        service_id: serviceId,
        start_time: selectedSlot,
      });
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
        <label className="block text-sm font-medium text-gray-700">
          Staff <span className="text-gray-400 font-normal">(optional — can assign later)</span>
        </label>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          disabled={loadingStaff}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value={UNASSIGNED}>Unassigned — decide later</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        {!loadingStaff && staffOptions.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">Nobody scheduled this date yet — booking will stay unassigned.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
        {loadingSlots && <p className="text-sm text-gray-500">Loading...</p>}
        {!loadingSlots && slots.length === 0 && (
          <p className="text-sm text-gray-500">No open hours this day — try another date.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => {
            const label = new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const isSelected = slot === selectedSlot;
            const isOccupied = occupiedSlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                title={isOccupied ? "This staff member already has a booking at this time" : undefined}
                className={`relative rounded border px-3 py-1.5 text-sm ${
                  isSelected ? "bg-black text-white border-black" : "border-gray-300"
                }`}
              >
                {label}
                {isOccupied && (
                  <span
                    className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${
                      isSelected ? "bg-white" : "bg-amber-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
        {occupiedSlots.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1" />
            Already has another booking at this time — still bookable, just a heads up.
          </p>
        )}
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
