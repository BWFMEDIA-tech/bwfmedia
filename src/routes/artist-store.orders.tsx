import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package } from "lucide-react";
import { getStoreOrderReceipt, listMyStoreOrders } from "@/lib/artist-store.functions";
import { formatPrice } from "@/lib/artist-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/artist-store/orders")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    ...(s.env === "live" ? { env: "live" as const } : s.env === "sandbox" ? { env: "sandbox" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "My Orders — Tunevio Artist Store" },
      { name: "description", content: "Track your Tunevio Artist Store orders, payment and shipping status." },
      { property: "og:title", content: "My Orders — Tunevio Artist Store" },
      { property: "og:description", content: "Track your Tunevio Artist Store orders, payment and shipping status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const STATUS_LABEL: Record<string, string> = { pending: "Awaiting payment confirmation", paid: "Paid", failed: "Payment failed", expired: "Checkout expired", refunded: "Refunded" };

function GuestOrderReceipt({ sessionId, environment }: { sessionId: string; environment: "sandbox" | "live" }) {
  const fetchReceipt = useServerFn(getStoreOrderReceipt);
  const { data, isLoading } = useQuery({
    queryKey: ["store-order-receipt", sessionId, environment],
    queryFn: () => fetchReceipt({ data: { sessionId, environment } }),
    refetchInterval: (q) => q.state.data?.order?.status === "pending" ? 4000 : false,
  });

  if (isLoading) return <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const order = data?.order;
  if (!order) return <div role="alert" className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">We couldn't find this order. Check that the complete receipt link was opened.</div>;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">{order.product_title}</h2>
          {order.variant_label && <p className="mt-1 text-sm text-muted-foreground">{order.variant_label}</p>}
          <p className="mt-1 text-sm text-muted-foreground">Quantity {order.quantity} · {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="shrink-0 text-right font-bold">{formatPrice(order.amount_total_cents ?? order.unit_price_cents * order.quantity, order.currency)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 ${order.status === "paid" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
        {order.status === "paid" && <span className="rounded-full bg-muted px-2.5 py-1 capitalize text-muted-foreground">{order.fulfillment_status}</span>}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {order.status === "paid" ? "Payment is confirmed. The artist can now prepare your order." : order.status === "pending" ? "Your payment is being confirmed securely. This page updates automatically." : "This checkout is no longer awaiting payment."}
      </p>
      {order.tracking_number && <p className="mt-3 text-sm">Tracking: <span className="text-muted-foreground">{order.carrier ? `${order.carrier} · ` : ""}{order.tracking_number}</span></p>}
      <p className="mt-5 text-xs text-muted-foreground">Keep this receipt link to check your order again.</p>
    </section>
  );
}

function OrdersPage() {
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const session_id = search.session_id;
  const env = "env" in search ? search.env : undefined;
  const fetchOrders = useServerFn(listMyStoreOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["my-store-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!user,
    refetchInterval: (q) => ((q.state.data as any)?.orders?.some((o: any) => o.status === "pending") ? 4000 : false),
  });

  if (loading) return <div className="grid h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user && session_id) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Package className="h-5 w-5 text-primary" /> Your order</h1>
        <GuestOrderReceipt sessionId={session_id} environment={env ?? "live"} />
        <Link to="/artist-store" className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold">Continue shopping</Link>
      </main>
    );
  }
  if (!user) return <main className="mx-auto max-w-md px-4 py-20 text-center"><p className="text-sm text-muted-foreground">Sign in to see your orders.</p><Link to="/login" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link></main>;

  const orders = data?.orders ?? [];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Package className="h-5 w-5 text-primary" /> My orders</h1>
      {session_id && <p className="mt-2 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">Thanks! Your order shows as paid once the payment is confirmed — this usually takes a few seconds.</p>}
      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No orders yet. <Link to="/artist-store" className="text-primary">Browse the store</Link></div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o: any) => (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{o.product_title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · Qty {o.quantity}</div>
                </div>
                <div className="text-right text-sm font-bold">{formatPrice(o.amount_total_cents ?? o.unit_price_cents * o.quantity, o.currency)}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${o.status === "paid" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                {o.status === "paid" && <span className="rounded-full bg-muted px-2 py-0.5 capitalize text-muted-foreground">{o.fulfillment_status}</span>}
                {o.tracking_number && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Tracking: {o.tracking_number}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
