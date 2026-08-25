"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignStaffToBooking } from "../actions";

type StaffOption = { id: string; full_name: string };

export default function StaffAssignmentPanel({
  bookingId,
  currentStaffId,
  currentStaffName,
  bookingDate, // "YYYY-MM-DD"
}: {
  bookingId: string;
  currentStaffId: string | null;
  currentStaffName: string | null;
  bookingDate: string;
}) {
  const [editing, setEditing] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selected, setSelected] = useState(currentStaffId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!editing) return;
    setLoadingStaff(true);
    fetch(`/api/staff-on-duty?date=${bookingDate}`)
      .then((r) => r.json())
      .then((data) => setStaffOptions(data.staff || []))
      .finally(() => setLoadingStaff(false));
  }, [editing, bookingDate]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await assignStaffToBooking(bookingId, selected || null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div>
        <p className="mt-1 font-medium text-slate-900">{currentStaffName ?? "Unassigned"}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-xs text-slate-500 underline underline-offset-4"
        >
          {currentStaffName ? "Reassign" : "Assign staff"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loadingStaff}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">Unassigned</option>
        {staffOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </select>
      {!loadingStaff && staffOptions.length === 0 && (
        <p className="text-xs text-amber-600 mt-1">Nobody scheduled this date.</p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setSelected(currentStaffId ?? "");
          }}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
