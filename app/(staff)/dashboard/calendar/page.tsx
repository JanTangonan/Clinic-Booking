import { createClient } from "@/lib/supabase/server";
import CalendarGrid from "./CalendarGrid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_details")
    .select("id, working_hours, profiles(full_name)")
    .eq("active", true);

  const dayStartISO = new Date(`${date}T00:00:00`).toISOString();
  const dayEndISO = new Date(new Date(`${date}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, staff_id, start_time, end_time, status, clients(full_name), services(name)")
    .gte("start_time", dayStartISO)
    .lt("start_time", dayEndISO)
    .order("start_time");

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Daily schedule
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review appointments by staff and jump straight into any booking.
          </p>
        </div>
      </div>
      <CalendarGrid date={date} staff={staff || []} bookings={bookings || []} />
    </div>
  );
}
