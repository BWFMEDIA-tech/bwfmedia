import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package } from "lucide-react";
import { listMyStoreOrders } from "@/lib/artist-store.functions";
import { formatPrice } from "@/lib/artist-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/artist-store/orders")({
  validateSearch: (s: Record<string, unknown>) => ({ session_id: typeof s.session_id === "string" ? s.session_id : undefined }),
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

function OrdersPage() {
  const { user, loading } = useAuth();
  const { session_id } = Route.useSearch();
  const fetchOrders = useServerFn(listMyStoreOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["my-store-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!user,
    refetchInterval: (q) => ((q.state.data as any)?.orders?.some((o: any) => o.status === "pending") ? 4000 : false),
  });

  if (loading) return <div className="grid h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
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
