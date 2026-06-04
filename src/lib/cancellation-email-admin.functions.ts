import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Admin-only view into the cancellation-email send log. Returns the most
// recent attempts plus aggregate counts so the dashboard can show
// dedup outcomes and surface failures that need attention.
export const getCancellationEmailLog = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Server-side admin check (don't trust the client).
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const isAdmin = !!roles?.some((r: any) => r.role === 'admin');
    if (!isAdmin) throw new Error('Forbidden');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    // Deduplicate by message_id: one row per email, latest status wins.
    // Pull a generous window (last 200) then dedup client-side.
    const { data: rows, error } = await supabaseAdmin
      .from('email_send_log')
      .select('id, message_id, recipient_email, status, error_message, metadata, created_at')
      .eq('template_name', 'checkout-cancellation')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const latest: any[] = [];
    const attemptCounts = new Map<string, number>();
    for (const r of rows ?? []) {
      if (!r.message_id) continue;
      attemptCounts.set(r.message_id, (attemptCounts.get(r.message_id) ?? 0) + 1);
      if (seen.has(r.message_id)) continue;
      seen.add(r.message_id);
      latest.push(r);
    }
    const entries = latest.map((r) => ({
      ...r,
      attempts: attemptCounts.get(r.message_id) ?? 1,
      // attempts > 1 means Stripe retried and the dedup guard kicked in
      // (one row won the unique-pending claim, others would 23505 and exit
      // without inserting; so multiple rows only appear when an earlier
      // attempt rolled forward to a terminal status before the retry).
      dedup_suppressed_retry: (attemptCounts.get(r.message_id) ?? 1) > 1,
    }));

    const stats = {
      total: entries.length,
      sent: entries.filter((e) => e.status === 'sent').length,
      pending: entries.filter((e) => e.status === 'pending').length,
      failed: entries.filter((e) => e.status === 'failed' || e.status === 'dlq').length,
      suppressed: entries.filter((e) => e.status === 'suppressed').length,
      retry_collisions: entries.filter((e) => e.dedup_suppressed_retry).length,
    };

    return { entries, stats, fetched_at: new Date().toISOString() };
  });