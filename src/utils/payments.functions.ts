import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

const PRICE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export const createCartCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: {
    items: Array<{ priceId: string; quantity: number }>;
    customerEmail?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Cart is empty");
    }
    if (data.items.length > 20) throw new Error("Too many items");
    for (const it of data.items) {
      if (!PRICE_ID_RE.test(it.priceId)) throw new Error("Invalid priceId");
      if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 10) {
        throw new Error("Invalid quantity");
      }
    }
    return data;
  })
  .handler(async ({ data }) => {
    const stripe = createStripeClient(data.environment);

    // Resolve human-readable price IDs to Stripe price objects via lookup_keys.
    const lookupKeys = data.items.map((i) => i.priceId);
    const prices = await stripe.prices.list({
      lookup_keys: lookupKeys,
      limit: 100,
    });
    const priceMap = new Map(prices.data.map((p) => [p.lookup_key!, p]));

    const lineItems = data.items.map((it) => {
      const price = priceMap.get(it.priceId);
      if (!price) throw new Error(`Price not found: ${it.priceId}`);
      return { price: price.id, quantity: it.quantity };
    });

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      managed_payments: { enabled: true },
      ...(data.customerEmail && { customer_email: data.customerEmail }),
    } as any);

    return session.client_secret;
  });