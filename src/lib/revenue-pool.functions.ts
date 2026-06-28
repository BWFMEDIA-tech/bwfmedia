import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc('has_role', {
    _user_id: ctx.userId,
    _role: 'admin',
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Forbidden');
}

/** Recalculate the pool snapshot for a given month (defaults to current). */
export const calculateMonthlyRevenuePool = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { month?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row, error } = await supabaseAdmin.rpc('calculate_monthly_revenue_pool', {
      _month: data?.month ?? undefined,
    });
    if (error) throw new Error(error.message);
    return row;
  });

/** Totals for a given month (defaults to current). */
export const getTotalRevenue = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { month?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase.rpc('get_total_revenue', {
      _month: data?.month ?? undefined,
    });
    if (error) throw new Error(error.message);
    return Array.isArray(rows) ? rows[0] : rows;
  });

/** Split helper (pure). */
export function splitRevenuePool(totalCents: number) {
  const total = Math.max(0, Math.floor(totalCents || 0));
  const artist = Math.floor((total * 75) / 100);
  const platform = Math.floor((total * 20) / 100);
  const incentive = total - artist - platform;
  return { artist_pool_cents: artist, platform_pool_cents: platform, incentive_pool_cents: incentive };
}

/** Latest N pool snapshots for the admin dashboard. */
export const listRevenuePools = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const limit = Math.min(Math.max(data?.limit ?? 12, 1), 60);
    const { data: rows, error } = await context.supabase
      .from('revenue_pools')
      .select('*')
      .order('month', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });