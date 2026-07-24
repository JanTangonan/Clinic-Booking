"use client";

import { useTransition } from "react";
import { toggleServiceActive } from "./actions";

export default function ServiceActiveToggle({ serviceId, active }: { serviceId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(async () => { await toggleServiceActive(serviceId, !active) })}
      disabled={isPending}
      className={`rounded px-2 py-1 text-xs border ${
        active ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 bg-gray-50 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}
