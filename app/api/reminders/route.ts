import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CLINIC_TIMEZONE } from "@/lib/date";

const REMINDER_WINDOW_HOURS = 24;

function singularize<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Clinic <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendSMS(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: process.env.TWILIO_FROM_NUMBER!,
      Body: body,
    }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

// GET /api/reminders — meant to be hit by a scheduler (Vercel Cron,
// GitHub Actions, cron-job.org, etc.), not by a logged-in user, so it
// runs on the SERVICE ROLE client rather than a session-based one —
// there is no user session when a cron job calls this.
export async function GET(request: NextRequest) {
  // Guards against this being triggered by anyone who finds the URL —
  // it sends real messages and costs real money per send, so it can't
  // be left open. Vercel Cron automatically attaches this header when
  // CRON_SECRET is set as an env var on the project; other schedulers
  // need to be configured to send it manually.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, start_time, clients(full_name, phone, email), services(name), staff_details(profiles(full_name))"
    )
    .in("status", ["pending", "confirmed"])
    .is("reminder_sent_at", null)
    .gte("start_time", now.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { booking_id: string; attempted: boolean; errors: string[] }[] = [];

  for (const booking of bookings || []) {
    const client = singularize(booking.clients);
    const service = singularize(booking.services);
    const staffDetails = singularize(booking.staff_details);
    const staffProfile = singularize(staffDetails?.profiles);

    const errors: string[] = [];
    let attempted = false;

    if (client) {
      const when = new Date(booking.start_time).toLocaleString("en-PH", {
        timeZone: CLINIC_TIMEZONE,
        dateStyle: "full",
        timeStyle: "short",
      });

      const messageText = `Hi ${client.full_name}, this is a reminder for your ${service?.name ?? "appointment"} with ${staffProfile?.full_name ?? "our team"} on ${when}. Please call us if you need to reschedule.`;

      if (client.email) {
        attempted = true;
        try {
          await sendEmail(client.email, "Appointment Reminder", `<p>${messageText}</p>`);
        } catch (e) {
          errors.push(`email: ${(e as Error).message}`);
        }
      }

      if (client.phone) {
        attempted = true;
        try {
          await sendSMS(client.phone, messageText);
        } catch (e) {
          errors.push(`sms: ${(e as Error).message}`);
        }
      }
    }

    // Mark as sent regardless of outcome — including when the client
    // has no email or phone at all. Without this, a booking with no
    // contact info (or a permanently bad number) would get re-checked
    // and re-attempted on every single cron run forever. Errors are
    // still captured in the response below so failures are visible.
    await supabase
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", booking.id);

    results.push({ booking_id: booking.id, attempted, errors });
  }

  return NextResponse.json({ processed: results.length, results });
}
