import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createBookingCheckout } from '@/lib/booking-checkout.functions';
import { BOOKING_PACKAGES, packagesForTable, type BookingTable } from '@/lib/booking-packages';
import { Button } from '@/components/ui/button';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';

export const Route = createFileRoute('/pay/$bookingId')({
  validateSearch: (s: Record<string, unknown>) => ({
    table: (s.table === 'block_bookings' ? 'block_bookings' : 'studio_bookings') as BookingTable,
    pkg: typeof s.pkg === 'string' ? s.pkg : undefined,
  }),
  component: PayPage,
});

function PayPage() {
  const { bookingId } = Route.useParams();
  const { table, pkg } = Route.useSearch();
  const [selected, setSelected] = useState<string | null>(pkg ?? null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const sessionTypeLabel = table === 'block_bookings' ? 'Off The Block Booking' : 'Studio Session';
  const selectedPackage = selected ? BOOKING_PACKAGES[selected] : null;

  const SummaryPanel = () => (
    <div className="mb-6 rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Order Summary</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Session Type</span>
          <span className="font-medium">{sessionTypeLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Package</span>
          <span className="font-medium">{selectedPackage ? selectedPackage.label : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Booking ID</span>
          <span className="font-mono text-xs">{bookingId.slice(0, 8)}</span>
        </div>
        <div className="border-t border-border pt-2 mt-2 flex justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold font-mono">
            {selectedPackage ? `$${(selectedPackage.amountCents / 100).toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );

  const startCheckout = async (packageId: string) => {
    setLoading(true);
    setError(null);
    try {
      const cs = await createBookingCheckout({
        data: {
          bookingId,
          packageId,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/pay/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      setClientSecret(cs);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  // Auto-start checkout when a package is preselected via search param
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStarted.current && pkg && BOOKING_PACKAGES[pkg] && !clientSecret && !loading) {
      autoStarted.current = true;
      void startCheckout(pkg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg]);

  if (clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        <PaymentTestModeBanner />
        <div className="max-w-2xl mx-auto px-6 py-10">
          <SummaryPanel />
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  const options = packagesForTable(table);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold mb-2">Complete your booking</h1>
        <p className="text-muted-foreground mb-6">Choose a package to pay for booking <span className="font-mono text-xs">{bookingId.slice(0, 8)}</span>.</p>
        <SummaryPanel />
        {error && <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="space-y-3">
          {options.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left p-4 rounded-lg border transition ${
                selected === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{p.label}</span>
                <span className="font-mono">${(p.amountCents / 100).toFixed(0)}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: '/' })}>Cancel</Button>
          <Button
            disabled={!selected || loading}
            onClick={() => selected && startCheckout(selected)}
            className="flex-1"
          >
            {loading ? 'Loading…' : selected ? `Pay $${(BOOKING_PACKAGES[selected].amountCents / 100).toFixed(0)}` : 'Select a package'}
          </Button>
        </div>
      </div>
    </div>
  );
}