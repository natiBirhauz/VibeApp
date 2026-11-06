import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/credits-guard";

export const runtime = "nodejs";

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const expectedBase64 = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");

  const received = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  if (received === expectedHex || received === expectedBase64) {
    return true;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHex, "hex"),
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
    req.headers.get("x-signature") ?? // Lemon Squeezy
    req.headers.get("hash") ??        // PayPlus
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
    // Support form-urlencoded callbacks (Grow/Meshulam sometimes send form data)
    try {
      const params = new URLSearchParams(body);
      payload = Object.fromEntries(params.entries());
    } catch {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }
  }

  // ── Normalize across PayPlus, Grow, Morning, Lemon Squeezy, and Stripe ──

  const txObj = (payload.transaction as Record<string, unknown>) ?? {};
  const dataObj =
    ((payload.data as Record<string, unknown>)?.object as Record<string, unknown>) ??
    (payload.data as Record<string, unknown>) ??
    payload;
  const metaObj = (payload.meta as Record<string, unknown>) ?? {};

  const eventType = String(
    payload.event ??
      payload.type ??
      metaObj.event_name ?? // Lemon Squeezy: "order_created"
      txObj.status_code ??  // PayPlus: "000"
      payload.status_code ??
      payload.status ??
      ""
  );

  const isSuccess =
    eventType === "000" || // PayPlus approved
    eventType === "1" ||   // Grow approved
    eventType === "order_created" || // Lemon Squeezy
    eventType === "payment.success" ||
    eventType === "charge.succeeded" ||
    eventType === "checkout.session.completed" ||
    eventType === "payment_intent.succeeded" ||
    eventType === "completed" ||
    payload.transaction_type === "Charge";

  if (!isSuccess) {
    return NextResponse.json({ received: true });
  }

  // Extract custom metadata across gateways
  let morningCustom: Record<string, unknown> = {};
  if (typeof payload.custom === "string") {
    try {
      morningCustom = JSON.parse(payload.custom);
    } catch {
      // ignore
    }
  }

  const customData =
    (metaObj.custom_data as Record<string, string>) ?? // Lemon Squeezy
    (dataObj.metadata as Record<string, string>) ??    // Stripe
    (payload.metadata as Record<string, string>) ??
    {};

  const userId = String(
    customData.user_id ??
      morningCustom.user_id ??
      txObj.more_info ??       // PayPlus
      dataObj.more_info ??
      payload.cField1 ??       // Grow / Meshulam
      dataObj.cField1 ??
      payload.customer_id ??
      ""
  ).trim();

  const creditsAdded = parseInt(
    String(
      customData.credits_added ??
        morningCustom.credits_added ??
        txObj.more_info_1 ??   // PayPlus
        dataObj.more_info_1 ??
        payload.cField2 ??     // Grow / Meshulam
        dataObj.cField2 ??
        payload.credits ??
        "0"
    ),
    10
  );

  const rawAmount =
    txObj.amount ??
    payload.sum ??
    payload.amount ??
    (dataObj.attributes as Record<string, unknown>)?.total ??
    dataObj.amount_total ??
    0;

  let amountPaid = parseFloat(String(rawAmount));
  // Stripe & LemonSqueezy report in cents/agorot
  if (amountPaid > 200) {
    amountPaid = amountPaid / 100;
  }

  const paymentId = String(
    txObj.uid ??
      payload.processId ??
      dataObj.id ??
      payload.id ??
      payload.payment_id ??
      ""
  ).trim();

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
