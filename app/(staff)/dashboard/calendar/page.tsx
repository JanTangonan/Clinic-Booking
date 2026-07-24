import { createClient } from "@/lib/supabase/server";
import { todayInClinicTZ } from "@/lib/date";
import CalendarGrid from "./CalendarGrid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam || todayInClinicTZ();

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
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Calendar</h1>
      <CalendarGrid date={date} staff={staff || []} bookings={bookings || []} />
    </div>
  );
}
