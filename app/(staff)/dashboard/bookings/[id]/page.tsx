import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CancelBookingForm from "./CancelBookingForm";
import CompleteBookingButton from "./CompleteBookingButton";
import { recordPayment } from "./payments-actions";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, start_time, status, cancellation_reason, cancellation_note, cancelled_at, completed_at, clients(id, full_name, phone), services(name, price, deposit_amount), staff_details(profiles(full_name))"
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  const client = booking.clients as unknown as { id: string; full_name: string; phone: string | null; };
  const service = booking.services as unknown as { name: string; price: number; deposit_amount: number };
  const staffProfile = (booking.staff_details as unknown as { profiles: { full_name: string } })?.profiles;

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, status, created_at, recorded_by:recorded_by(full_name)")
    .eq("booking_id", id)
    .order("created_at", { ascending: false });

  const totalPaid = (payments || [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(service.price - totalPaid, 0);
  const depositMet = service.deposit_amount > 0 && totalPaid >= service.deposit_amount;
  const fullyPaid = totalPaid >= service.price;

  const isCancelled = booking.status === "cancelled" || booking.status === "no_show";
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  const bookingDate = new Date(booking.start_time);
  const formattedDate = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", }).format(bookingDate);

  const statusLabel = booking.status.replace("_", " ");
  const statusClasses = isCancelled
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : booking.status === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : booking.status === "confirmed"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-amber-200 bg-amber-50 text-amber-800";

  const isCompleted = booking.status === "completed";
  const isActionable = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Booking details
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isCancelled ? "Booking cancelled" : isCompleted ? "Booking completed" : "Booking confirmed"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review the appointment details and manage the booking from one place.
          </p>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${statusClasses}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Appointment</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {service?.name ?? "Service"}
              </h2>
            </div>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              ₱{service?.price?.toLocaleString() ?? "0"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Client</p>
              <p className="mt-1 font-medium text-slate-900">{client?.full_name}</p>
              {client?.phone && <p className="text-sm text-slate-600">{client.phone}</p>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Staff</p>
              <p className="mt-1 font-medium text-slate-900">
                {staffProfile?.full_name ?? "Unassigned"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <p className="text-sm text-slate-500">When</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{formattedDate}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Client profile</p>
            <p className="mt-2 text-sm text-slate-700">{client?.full_name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {client?.phone ? `Phone: ${client.phone}` : "No phone number on file"}
            </p>
            <Link
              href={`/dashboard/clients/${client?.id}`}
              className="mt-4 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4"
            >
              View client profile
            </Link>
          </div>

          {canCancel ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Need to change this booking?</p>
              <p className="mt-1 text-sm text-amber-800">
                Cancel it here and leave a reason for the record.
              </p>
              <CancelBookingForm bookingId={booking.id} />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              This booking is no longer eligible for cancellation.
            </div>
          )}
        </aside>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Payments</p>
            <p className="mt-1 text-sm text-slate-600">Track deposits and the remaining balance.</p>
          </div>
          <div className="flex gap-1.5">
            {fullyPaid ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Fully paid
              </span>
            ) : depositMet ? (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Deposit paid
              </span>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Unpaid
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <span>Service price</span>
            <p className="mt-1 font-semibold text-slate-900">₱{service.price.toLocaleString()}</p>
          </div>
          <div>
            <span>Total collected</span>
            <p className="mt-1 font-semibold text-slate-900">₱{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <span>Balance due</span>
            <p className="mt-1 font-semibold text-slate-900">₱{balanceDue.toLocaleString()}</p>
          </div>
        </div>

        {payments && payments.length > 0 && (
          <ul className="mb-4 divide-y divide-slate-200 text-sm">
            {payments.map((p) => {
              const recorder = Array.isArray(p.recorded_by) ? p.recorded_by[0] : p.recorded_by;
              return (
                <li key={p.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      ₱{Number(p.amount).toLocaleString()} · <span className="capitalize">{p.method.replace("_", " ")}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {recorder?.full_name || "Staff member"} · {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="self-start text-xs capitalize text-slate-500">{p.status}</span>
                </li>
              );
            })}
          </ul>
        )}

        {!isCancelled && !fullyPaid && (
          <form action={recordPayment.bind(null, booking.id)} className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Amount (₱)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                required
                defaultValue={balanceDue > 0 ? balanceDue : undefined}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Method</label>
              <select name="method" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
              Record
            </button>
          </form>
        )}

        {!isCancelled && fullyPaid && (
          <p className="border-t border-slate-200 pt-4 text-sm text-slate-500">Nothing left to collect.</p>
        )}
      </section>

      {isCancelled && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
          <p className="font-semibold">Cancellation details</p>
          <p className="mt-2">
            Reason: <span className="font-medium capitalize">{booking.cancellation_reason?.replace("_", " ")}</span>
          </p>
          {booking.cancellation_note && (
            <p className="mt-2">Note: {booking.cancellation_note}</p>
          )}
          {booking.cancelled_at && (
            <p className="mt-3 text-xs text-rose-700">
              Cancelled on {new Date(booking.cancelled_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {isCompleted && booking.completed_at && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
          <p className="font-semibold">Completion details</p>
          <p className="mt-3 text-xs text-green-700">
            Completed {new Date(booking.completed_at).toLocaleString()}
          </p>
        </div>
      )}

      {isActionable && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <CompleteBookingButton bookingId={booking.id} />
          <Link
            href={`/dashboard/bookings/${booking.id}/reschedule`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Reschedule
          </Link>
        </div>
      )}

      <Link
        href={`/dashboard/clients/${client?.id}`}
        className="mt-6 inline-flex items-center text-sm font-medium text-slate-700 underline underline-offset-4"
      >
        ← Back to {client?.full_name}
      </Link>
    </div>
  );
}