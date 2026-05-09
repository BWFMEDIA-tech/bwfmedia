import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getBookingByStripeSession } from '@/lib/booking-checkout.functions';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/pay/return')({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === 'string' ? s.session_id : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'unknown'>('loading');
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (!session_id) { setStatus('unknown'); return; }
    let attempts = 0;
    let cancelled = false;
    const tick = async () => {
      attempts++;
      const result = await getBookingByStripeSession({ data: { sessionId: session_id } });
      if (cancelled) return;
      const bookingStatus = (result?.booking as any)?.status;
      const fullName = (result?.booking as any)?.full_name;
      if (fullName) setName(fullName);
      if (bookingStatus === 'confirmed' || bookingStatus === 'delivered') {
        setStatus('paid');
      } else if (attempts < 8) {
        setTimeout(tick, 1500);
      } else {
        setStatus('pending');
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [session_id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (<>
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <h1 className="text-2xl font-semibold mb-2">Confirming your payment…</h1>
          <p className="text-muted-foreground">This usually takes a few seconds.</p>
        </>)}
        {status === 'paid' && (<>
          <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-emerald-500" />
          <h1 className="text-3xl font-semibold mb-2">Booking confirmed{name ? `, ${name.split(' ')[0]}` : ''}!</h1>
          <p className="text-muted-foreground mb-6">We've received your payment. The BWF team will reach out to confirm the schedule.</p>
          <Button asChild><Link to="/">Back to home</Link></Button>
        </>)}
        {status === 'pending' && (<>
          <h1 className="text-2xl font-semibold mb-2">Payment received</h1>
          <p className="text-muted-foreground mb-6">We're still processing the confirmation on our end. You'll get an email shortly.</p>
          <Button asChild><Link to="/">Back to home</Link></Button>
        </>)}
        {status === 'unknown' && (<>
          <h1 className="text-2xl font-semibold mb-2">No session info</h1>
          <p className="text-muted-foreground mb-6">We couldn't find a payment session in the URL.</p>
          <Button asChild><Link to="/">Back to home</Link></Button>
        </>)}
      </div>
    </div>
  );
}