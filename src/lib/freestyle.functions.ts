import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const streamInput = z.object({ streamId: z.string().uuid() });
export const getFreestyleState = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => streamInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: initial, error } = await supabase.from('freestyle_battles').select('*').eq('stream_id', data.streamId).order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!initial) return { battle: null, artists: [], myVote: null, serverTime: Date.now() };
    if (initial.status === 'live' && Date.parse(initial.ends_at) <= Date.now()) {
      const { error: finishError } = await supabase.rpc('finalize_freestyle_battle', { _id: initial.id });
      if (finishError) throw new Error(finishError.message);
    }
    const [battleResult, profiles, vote] = await Promise.all([
      supabase.from('freestyle_battles').select('*').eq('id', initial.id).single(),
      supabase.from('profiles').select('id,display_name,stage_name,avatar_url,genre,genres').in('id', [initial.artist_a_id, initial.artist_b_id]),
      supabase.from('freestyle_votes').select('choice').eq('battle_id', initial.id).eq('user_id', userId).maybeSingle(),
    ]);
    if (battleResult.error || profiles.error || vote.error) throw new Error('Could not load freestyle battle');
    return { battle: battleResult.data, artists: profiles.data ?? [], myVote: vote.data?.choice ?? null, serverTime: Date.now() };
  });

export const startFreestyle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => streamInput.extend({ artistA: z.string().uuid(), artistB: z.string().uuid(), duration: z.number().int().min(30).max(900) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: stream, error: streamError } = await context.supabase.from('streams').select('host_id,room_name,status').eq('id', data.streamId).single();
    if (streamError || !stream || stream.host_id !== context.userId || stream.status !== 'live') throw new Error('Only the live stream owner can start freestyle battles');
    const key = process.env['LIVEKIT_API_KEY'];
    const secret = process.env['LIVEKIT_API_SECRET'];
    const url = process.env['LIVEKIT_URL'];
    if (!key || !secret || !url) throw new Error('Live video is unavailable');
    const { RoomServiceClient } = await import('livekit-server-sdk');
    const service = new RoomServiceClient(url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), key, secret);
    const connected = await service.listParticipants(stream.room_name);
    for (const id of [data.artistA, data.artistB]) {
      const artist = connected.find(p => p.identity === id);
      if (!artist || !artist.permission?.canPublish || !artist.tracks.some(t => t.source === 1 && !t.muted)) throw new Error('Both artists must be connected with live cameras before starting');
    }
    const { data: id, error } = await context.supabase.rpc('start_freestyle_battle', { _stream_id: data.streamId, _artist_a: data.artistA, _artist_b: data.artistB, _duration: data.duration });
    if (error) throw new Error(error.message);
    return id;
  });

export const voteFreestyle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ battleId: z.string().uuid(), choice: z.enum(['a', 'b']) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('cast_freestyle_vote', { _battle_id: data.battleId, _choice: data.choice });
    if (error) throw new Error(error.message);
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.ok !== true) throw new Error('Voting is closed');
    return { ok: true };
  });

export const cancelFreestyle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ battleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('cancel_freestyle_battle', { _id: data.battleId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });