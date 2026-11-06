import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getVerifiedUserId } from "@/lib/credits-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { packageId, userId: clientUserId } = (await req.json()) as {
    packageId: string;
    userId: string;
  };

  const userId = await getVerifiedUserId(clientUserId);
  if (!userId) {
    return NextResponse.json(
      { error: "יש להתחבר לחשבון לפני רכישת קרדיטים." },
      { status: 401 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  try {
    const provider = getPaymentProvider();
    const session = await provider.createCheckoutSession(
      packageId,
      userId,
      `${origin}/dashboard?payment=success`,
      `${origin}/pricing?payment=cancelled`
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "שגיאה ביצירת עמוד תשלום" },
      { status: 500 }
    );
  }
}
