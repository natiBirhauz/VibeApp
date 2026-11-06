import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { packageId, userId } = await req.json() as {
    packageId: string;
    userId: string;
  };

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
