/**
 * Unified payment provider interface supporting Israeli gateways & global gateways:
 *   payplus | grow | morning | lemonsqueezy | stripe
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

// ─── 1. PayPlus (פייפלוס — סליקה ישראלית) ────────────────────────────────────

class PayPlusProvider implements PaymentProvider {
  async createCheckoutSession(
    packageId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error(`Unknown package: ${packageId}`);

    const apiKey = process.env.PAYPLUS_API_KEY;
    const secretKey = process.env.PAYPLUS_SECRET_KEY;
    const pageUid = process.env.PAYPLUS_PAGE_UID;

    if (!apiKey || !secretKey || !pageUid) {
      throw new Error("PayPlus credentials missing in environment variables");
    }

    const isDev = process.env.PAYPLUS_ENV === "sandbox";
    const baseUrl = isDev
      ? "https://restapidev.payplus.co.il/api/v1.0/PaymentPages/generateLink"
      : "https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink";

    const origin = new URL(successUrl).origin;

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: JSON.stringify({
          api_key: apiKey,
          secret_key: secretKey,
        }),
      },
      body: JSON.stringify({
        payment_page_uid: pageUid,
        charge_method: 1, // Immediate charge
        amount: pkg.priceILS,
        currency_code: "ILS",
        more_info: userId,
        more_info_1: String(pkg.credits),
        more_info_2: packageId,
        refURL_success: successUrl,
        refURL_failure: cancelUrl,
        refURL_callback: `${origin}/api/webhooks/payment`,
        items: [
          {
            name: `VibeApp — חבילת ${pkg.name} (${pkg.credits} קרדיטים)`,
            quantity: 1,
            price: pkg.priceILS,
          },
        ],
      }),
    });

    const data = await res.json();
    const link = data?.data?.payment_page_link;
    const uid = data?.data?.page_request_uid;

    if (!link) {
      throw new Error(data?.results?.description ?? "PayPlus link generation failed");
    }

    return { url: link, sessionId: uid ?? crypto.randomUUID() };
  }
}

// ─── 2. Grow / Meshulam (גרו / משולם — סליקה ישראלית + Bit + Apple Pay) ──────

class GrowProvider implements PaymentProvider {
  async createCheckoutSession(
    packageId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error(`Unknown package: ${packageId}`);

    const pageCode = process.env.GROW_PAGE_CODE;
    const growUserId = process.env.GROW_USER_ID;

    if (!pageCode || !growUserId) {
      throw new Error("Grow (Meshulam) credentials missing in environment variables");
    }

    const isDev = process.env.GROW_ENV === "sandbox";
    const baseUrl = isDev
      ? "https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess"
      : "https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess";

    const origin = new URL(successUrl).origin;
    const formData = new URLSearchParams();
    formData.append("pageCode", pageCode);
    formData.append("userId", growUserId);
    formData.append("sum", String(pkg.priceILS));
    formData.append("description", `VibeApp — חבילת ${pkg.name} (${pkg.credits} קרדיטים)`);
    formData.append("successUrl", successUrl);
    formData.append("cancelUrl", cancelUrl);
    formData.append("notifyUrl", `${origin}/api/webhooks/payment`);
    formData.append("cField1", userId);
    formData.append("cField2", String(pkg.credits));
    formData.append("cField3", packageId);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await res.json();
    const url = data?.data?.url;
    const processId = data?.data?.processId;

    if (!url) {
      throw new Error(data?.err?.message ?? "Grow payment creation failed");
    }

    return { url, sessionId: String(processId ?? crypto.randomUUID()) };
  }
}

// ─── 3. Morning / GreenInvoice (חשבונית ירוקה) ───────────────────────────────

class MorningProvider implements PaymentProvider {
  async createCheckoutSession(
    packageId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error(`Unknown package: ${packageId}`);

    const apiKey = process.env.MORNING_API_KEY;
    const apiSecret = process.env.MORNING_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("Morning (GreenInvoice) credentials missing");
    }

    const baseUrl =
      process.env.MORNING_ENV === "sandbox"
        ? "https://sandbox.d.greeninvoice.co.il/api/v1"
        : "https://api.greeninvoice.co.il/api/v1";

    // 1. Obtain JWT token
    const tokenRes = await fetch(`${baseUrl}/account/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: apiKey, secret: apiSecret }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData?.token) {
      throw new Error("Morning authentication failed");
    }

    const origin = new URL(successUrl).origin;

    // 2. Request payment form URL
    const formRes = await fetch(`${baseUrl}/payments/form`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.token}`,
      },
      body: JSON.stringify({
        description: `VibeApp — חבילת ${pkg.name} (${pkg.credits} קרדיטים)`,
        type: 320, // Invoice Receipt (חשבונית מס קבלה)
        lang: "he",
        currency: "ILS",
        vatType: 0,
        amount: pkg.priceILS,
        maxPayments: 1,
        successUrl,
        failureUrl: cancelUrl,
        notifyUrl: `${origin}/api/webhooks/payment`,
        custom: JSON.stringify({
          user_id: userId,
          credits_added: pkg.credits,
          package_id: packageId,
        }),
      }),
    });

    const formData = await formRes.json();
    if (!formData?.url) {
      throw new Error(formData?.errorMessage ?? "Morning form creation failed");
    }

    return { url: formData.url, sessionId: formData.id ?? crypto.randomUUID() };
  }
}

// ─── 4. Lemon Squeezy (עובד מצוין מישראל ללא פתיחת תיק סליקה מקומי) ──────────

class LemonSqueezyProvider implements PaymentProvider {
  async createCheckoutSession(
    packageId: string,
    userId: string,
    successUrl: string
  ): Promise<CheckoutSession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error(`Unknown package: ${packageId}`);

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId =
      packageId === "starter"
        ? process.env.LEMONSQUEEZY_VARIANT_STARTER
        : packageId === "pro"
        ? process.env.LEMONSQUEEZY_VARIANT_PRO
        : process.env.LEMONSQUEEZY_VARIANT_STUDIO;

    if (!apiKey || !storeId || !variantId) {
      throw new Error("Lemon Squeezy credentials missing");
    }

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              custom: {
                user_id: userId,
                credits_added: String(pkg.credits),
                package_id: packageId,
              },
            },
            product_options: {
              redirect_url: successUrl,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: String(storeId) } },
            variant: { data: { type: "variants", id: String(variantId) } },
          },
        },
      }),
    });

    const json = await res.json();
    const url = json?.data?.attributes?.url;
    if (!url) {
      throw new Error("Lemon Squeezy checkout creation failed");
    }

    return { url, sessionId: json.data.id };
  }
}

// ─── 5. Stripe implementation ────────────────────────────────────────────────

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
  const provider = (process.env.PAYMENT_PROVIDER ?? "payplus").toLowerCase();

  switch (provider) {
    case "payplus":
      return new PayPlusProvider();
    case "grow":
    case "meshulam":
      return new GrowProvider();
    case "morning":
    case "greeninvoice":
      return new MorningProvider();
    case "lemonsqueezy":
      return new LemonSqueezyProvider();
    case "stripe":
      return new StripeProvider();
    default:
      return new PayPlusProvider();
  }
}
