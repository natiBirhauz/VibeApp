import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  // Support both raw hex and "sha256=<hex>" formats
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
  const signature =
    req.headers.get("x-webhook-signature") ??
    req.headers.get("x-hub-signature-256") ??
    "";

  const body = await req.text();

  // Verify signature
  if (webhookSecret && !verifyHmac(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Normalize event type (different gateways use different field names)
  const eventType =
    (payload.event as string) ??
    (payload.type as string) ??
    (payload.status as string) ??
    "";

  const isSuccess =
    eventType === "payment.success" ||
    eventType === "charge.succeeded" ||
    eventType === "payment_intent.succeeded" ||
    eventType === "completed";

  if (!isSuccess) {
    // Not a success event — acknowledge and ignore
    return NextResponse.json({ received: true });
  }

  // Extract user & amount from payload (normalize across providers)
  const userId =
    (payload.metadata as Record<string, string>)?.user_id ??
    (payload.customer_id as string) ??
    null;

  const creditsAdded = parseInt(
    String(
      (payload.metadata as Record<string, string>)?.credits_added ??
      (payload.credits as string) ??
      "0"
    )
  );

  const amountPaid = parseFloat(
    String((payload.amount as number) ?? (payload.amount_total as number) ?? 0)
  ) / 100; // cents to currency units

  const paymentId =
    (payload.id as string) ??
    (payload.payment_id as string) ??
    crypto.randomUUID();

  if (!userId || creditsAdded <= 0) {
    return NextResponse.json({ error: "Missing user_id or credits_added" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Add credits
  const { error: creditError } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: creditsAdded,
  });

  if (creditError) {
    console.error("add_credits failed:", creditError);
    return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
  }

  // Log transaction
  await supabase.from("transactions").insert({
    user_id: userId,
    amount_paid: amountPaid,
    credits_added: creditsAdded,
    payment_id: paymentId,
  });

  return NextResponse.json({ received: true, creditsAdded });
}
