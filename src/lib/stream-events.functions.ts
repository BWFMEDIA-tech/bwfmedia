import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const VALID_TIERS = ['free', 'premium', 'fan_premium', 'student'] as const;
type UserTier = (typeof VALID_TIERS)[number];

/** Log a track play. `valid_stream` is derived server-side (>= 30s).
 * Requires `track_id` (no default) and full engagement payload so the
 * royalty engine can compute weighted value deterministically. */
export const recordStreamEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    track_id: string;
    duration_played_seconds: number;
    user_tier: UserTier;
    full_listen?: boolean;
    liked?: boolean;
    saved?: boolean;
    shared?: boolean;
    client_session_id?: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (!data?.track_id || typeof data.track_id !== 'string') {
      throw new Error('track_id is required');
    }
    if (!VALID_TIERS.includes(data.user_tier)) {
      throw new Error('user_tier must be one of: ' + VALID_TIERS.join(', '));
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const duration = Math.max(0, Math.floor(Number(data.duration_played_seconds) || 0));
    // Trusted fields (tier, weighting, validity, anomaly scores) are computed
    // inside the database routine — never accepted from the client.
    const { data: row, error } = await (context.supabase as any).rpc('record_stream_event', {
      p_track_id: data.track_id,
      p_duration_played_seconds: duration,
      p_full_listen: !!data.full_listen,
      p_liked: !!data.liked,
      p_saved: !!data.saved,
      p_shared: !!data.shared,
      p_client_session_id: data.client_session_id ?? null,
      p_metadata: data.metadata ?? {},
    });
    if (error) throw new Error(error.message);
    return row as {
      id: string;
      valid_stream: boolean;
      duration_played_seconds: number;
      weighted_value: number;
    };
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