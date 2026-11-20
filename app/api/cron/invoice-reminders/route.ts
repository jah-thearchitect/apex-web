import { NextResponse } from "next/server";
import { runInvoiceReminders } from "@/lib/invoiceReminders";

// Runs hourly (vercel.json). Emails clients the 48-hour and 72-hour reminders
// for unpaid invoices, during the working day. Vercel signs cron calls with
// CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json(await runInvoiceReminders());
}
