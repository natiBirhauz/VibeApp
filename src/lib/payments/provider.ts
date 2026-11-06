/**
 * Unified payment provider interface.
 * Swap out the implementation via PAYMENT_PROVIDER env var:
 *   stripe | grow | payplus | morning
 */

export interface CreditPackage {
  id: string;
  credits: number;
  priceILS: number;
  name: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", credits: 50,  priceILS: 19, name: "מתחיל" },
  { id: "pro",     credits: 150, priceILS: 49, name: "מקצועי" },
  { id: "studio",  credits: 400, priceILS: 99, name: "סטודיו" },
];

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface PaymentProvider {
  createCheckoutSession(
    packageId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession>;
}

// ─── Stripe implementation (default) ─────────────────────────────────────────

class StripeProvider implements PaymentProvider {
  async createCheckoutSession(
    packageId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error(`Unknown package: ${packageId}`);

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "ils",
      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: pkg.priceILS * 100, // agorot
            product_data: { name: `VibeApp — ${pkg.name} (${pkg.credits} קרדיטים)` },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        credits_added: String(pkg.credits),
        package_id: packageId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { url: session.url!, sessionId: session.id };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "stripe";

  switch (provider) {
    case "stripe":
      return new StripeProvider();
    // TODO: Add Grow / PayPlus / Morning when API keys are available
    default:
      return new StripeProvider();
  }
}
