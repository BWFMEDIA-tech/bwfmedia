import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function ConsumptionNotice() {
  return <section className="mx-auto max-w-lg space-y-4 px-6 py-12 text-center">
    <h1 className="text-2xl font-semibold text-foreground">Your Tunevio account</h1>
    <p className="text-sm text-muted-foreground">Digital purchases are not available in this iPhone app. Your existing account access stays unchanged.</p>
    <Button asChild><Link to="/home">Continue to music</Link></Button>
  </section>;
}