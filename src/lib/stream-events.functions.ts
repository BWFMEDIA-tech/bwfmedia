import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Log a track play. `valid_stream` is derived server-side (>= 30s). */
export const recordStreamEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    track_id: string;
    duration_played_seconds: number;
    client_session_id?: string;
    metadata?: Record<string, unknown>;
  }) => data)
  .handler(async ({ data, context }) => {
    const duration = Math.max(0, Math.floor(Number(data.duration_played_seconds) || 0));
    const { data: row, error } = await context.supabase
      .from('stream_events')
      .insert({
        user_id: context.userId,
        track_id: data.track_id,
        duration_played_seconds: duration,
        client_session_id: data.client_session_id ?? null,
        metadata: data.metadata ?? {},
      })
      .select('id, valid_stream, duration_played_seconds')
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Artist dashboard summary (subscription + earnings placeholder). */
export const getMyArtistDashboard = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('get_my_artist_dashboard');
    if (error) throw new Error(error.message);
    return data as {
      subscription: null | {
        status: string;
        role: string | null;
        price_id: string;
        current_period_end: string | null;
        cancel_at_period_end: boolean;
      };
      earnings_cents: number;
      payout_ready: boolean;
      streams: { total: number; valid: number };
    };
  });