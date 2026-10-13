import { NextResponse } from "next/server";
import { sendPaymentNudges } from "@/lib/paymentNudge";

// Daily (vercel.json). Vercel signs cron calls with CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ sent: await sendPaymentNudges() });
}
