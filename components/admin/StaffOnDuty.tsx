interface StaffMember {
  name: string;
  startTime: string;
  endTime: string;
}

interface StaffOnDutyProps {
  staff: StaffMember[];
  scheduleUrl: string;
}

function formatTimeToAmPm(time: string) {
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  return `${hour}:${String(minute).padStart(2, "0")}${period}`;
}

export function StaffOnDuty({ staff, scheduleUrl }: StaffOnDutyProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Staff on duty today</h3>
      {staff.length > 0 ? (
        <div className="space-y-3">
          {staff.map((member, idx) => (
            <div key={idx} className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{member.name}</p>
              </div>
              <p className="text-sm text-slate-600">
                {formatTimeToAmPm(member.startTime)} – {formatTimeToAmPm(member.endTime)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-slate-500 text-sm mb-3">Nobody scheduled today.</p>
          <a href={scheduleUrl} className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            Set today's schedule
          </a>
        </div>
      )}
    </div>
  );
}
