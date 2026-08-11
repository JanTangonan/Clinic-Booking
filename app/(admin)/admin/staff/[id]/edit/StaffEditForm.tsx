"use client";

import { useState, useTransition } from "react";
import { updateStaffDetails } from "../../actions";

export default function StaffEditForm({
  staffId,
  initialSpecialties,
  initialActive,
}: {
  staffId: string;
  initialSpecialties: string[];
  initialActive: boolean;
}) {
  const [specialtiesText, setSpecialtiesText] = useState(initialSpecialties.join(", "));
  const [active, setActive] = useState(initialActive);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const specialties = specialtiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const result = await updateStaffDetails({ staffId, specialties, active });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              setSaved(false);
            }}
          />
          Active (can be assigned bookings)
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
        <input
          value={specialtiesText}
          onChange={(e) => {
            setSpecialtiesText(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. Facials, Chemical Peels, Microneedling"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Comma-separated. Informational only for now.</p>
      </div>

      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
        <p className="text-gray-600">
          Working hours are now set per day, not here.{" "}
          <a href="/admin/staff-schedule" className="underline">
            Go to Staff Schedule
          </a>{" "}
          to set this person&apos;s hours for a specific date.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-sm text-green-600">Saved.</p>}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
