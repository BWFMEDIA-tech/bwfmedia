import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCartCheckoutSession } from "@/utils/payments.functions";

interface Props {
  items: Array<{ priceId: string; quantity: number }>;
  customerEmail?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckoutCart({ items, customerEmail, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const cs = await createCartCheckoutSession({
      data: {
        items,
        customerEmail,
        returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if (!cs) throw new Error("No client secret");
    return cs;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}