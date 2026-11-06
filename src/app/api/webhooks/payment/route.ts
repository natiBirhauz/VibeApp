import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/credits-guard";

export const runtime = "nodejs";

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const received = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";

  // SECURITY: Never accept unsigned webhooks in production
  if (isProd && !webhookSecret) {
    console.error("CRITICAL: PAYMENT_WEBHOOK_SECRET is not configured in production");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature =
    req.headers.get("x-webhook-signature") ??
    req.headers.get("x-hub-signature-256") ??
    req.headers.get("stripe-signature") ??
    "";

  const body = await req.text();

  // Verify signature when secret is present
  if (webhookSecret && !verifyHmac(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Normalize event type across Stripe / Grow / PayPlus / Morning
  const eventType =
    (payload.event as string) ??
    (payload.type as string) ??
    (payload.status as string) ??
    "";

  const isSuccess =
    eventType === "payment.success" ||
    eventType === "charge.succeeded" ||
    eventType === "checkout.session.completed" ||
    eventType === "payment_intent.succeeded" ||
    eventType === "completed";

  if (!isSuccess) {
    return NextResponse.json({ received: true });
  }

  // Extract metadata (support nested data.object for Stripe)
  const dataObj =
    ((payload.data as Record<string, unknown>)?.object as Record<string, unknown>) ??
    payload;

  const metadata =
    (dataObj.metadata as Record<string, string>) ??
    (payload.metadata as Record<string, string>) ??
    {};

  const userId =
    metadata.user_id ??
    (dataObj.customer_id as string) ??
    (payload.customer_id as string) ??
    null;

  const creditsAdded = parseInt(
    String(
      metadata.credits_added ??
      dataObj.credits ??
      payload.credits ??
      "0"
    ),
    10
  );

  const rawAmount =
    (dataObj.amount_total as number) ??
    (dataObj.amount as number) ??
    (payload.amount as number) ??
    0;

  const amountPaid = parseFloat(String(rawAmount)) / 100;

  const paymentId =
    (dataObj.id as string) ??
    (payload.id as string) ??
    (payload.payment_id as string) ??
    null;

  if (!userId || !paymentId || creditsAdded <= 0 || creditsAdded > 5000) {
    return NextResponse.json(
      { error: "Missing or invalid user_id, payment_id, or credits_added" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ received: true, creditsAdded, demo: true });
  }

  const supabase = createServiceClient();

  // IDEMPOTENCY CHECK: Ensure this payment_id hasn't been credited already
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Log transaction first (UNIQUE constraint on payment_id prevents race condition)
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: userId,
    amount_paid: amountPaid,
    credits_added: creditsAdded,
    payment_id: paymentId,
  });

  if (txError) {
    console.error("Transaction insert failed (likely duplicate):", txError);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Add credits atomically
  const { error: creditError } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: creditsAdded,
  });

  if (creditError) {
    console.error("add_credits failed:", creditError);
    return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
  }

  return NextResponse.json({ received: true, creditsAdded });
}
