import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { auditCatalog, type CatalogSong } from './royalty-finder';
import { splitTotal, RIGHTS_ORGS } from './rights';

async function requireArtist(sb: SupabaseClient<Database>, userId: string) {
  const [artist, admin] = await Promise.all([
    sb.rpc('has_role', { _user_id: userId, _role: 'artist' }),
    sb.rpc('has_role', { _user_id: userId, _role: 'admin' }),
  ]);
  if (artist.error || admin.error || (!artist.data && !admin.data)) throw new Error('Artist access required');
}
export const getRoyaltyScans = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireArtist(context.supabase, context.userId);
    const { data, error } = await context.supabase.from('royalty_catalog_scans').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(50);
    if (error) throw new Error('Could not load scan history');
    return data;
  });
export const getRoyaltyFindings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ scanId: z.string().uuid(), page: z.number().int().min(0).default(0) }).parse(d))
  .handler(async ({ context, data }) => {
    const result = await context.supabase.from('royalty_scan_findings').select('*', { count: 'exact' }).eq('user_id', context.userId).eq('scan_id', data.scanId).order('created_at').order('id').range(data.page * 50, data.page * 50 + 49);
    if (result.error) throw new Error('Could not load findings');
    return { findings: result.data, total: result.count ?? 0 };
  });
export const resolveRoyaltyFinding = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const result = await context.supabase.from('royalty_scan_findings').update({ resolved: data.resolved }).eq('user_id', context.userId).eq('id', data.id).select('id').single();
    if (result.error) throw new Error('Could not update this finding');
    return { ok: true };
  });
export const scanRoyaltyCatalog = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ trackId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase, uid = context.userId;
    await requireArtist(sb, uid);
    const tracks: Database['public']['Tables']['play_tracks']['Row'][] = [];
    for (let offset = 0; ; offset += 500) {
      let query = sb.from('play_tracks').select('*').eq('artist_user_id', uid).order('id').range(offset, offset + 499);
      if (data.trackId) query = query.eq('id', data.trackId);
      const result = await query;
      if (result.error) throw new Error('Could not read your catalog');
      tracks.push(...result.data);
      if (result.data.length < 500) break;
    }
    if (data.trackId && !tracks.length) throw new Error('Song not found in your catalog');
    const songs: CatalogSong[] = [];
    for (let offset = 0; offset < tracks.length; offset += 100) {
      const batch = tracks.slice(offset, offset + 100), ids = batch.map(t => t.id);
      const [rights, distribution] = await Promise.all([
        sb.from('song_rights').select('*').eq('user_id', uid).in('track_id', ids),
        sb.from('distribution_release_tracks').select('published_track_id,isrc,distribution_releases!inner(user_id,songwriters,publisher_name,pro_affiliation)').in('published_track_id', ids).eq('distribution_releases.user_id', uid),
      ]);
      if (rights.error || distribution.error) throw new Error('Could not read song rights metadata');
      const splits = rights.data.length ? await sb.from('song_rights_splits').select('*').eq('user_id', uid).in('song_rights_id', rights.data.map(r => r.id)) : { data: [], error: null };
      if (splits.error) throw new Error('Could not read ownership splits');
      for (const track of batch) {
        const right = rights.data.find(r => r.track_id === track.id);
        const dist = distribution.data.find(r => r.published_track_id === track.id);
        const release = dist?.distribution_releases;
        const ownSplits = (splits.data ?? []).filter(s => s.song_rights_id === right?.id);
        const refs: Record<string, string> = {};
        if (right?.registration_refs && typeof right.registration_refs === 'object' && !Array.isArray(right.registration_refs)) {
          for (const [key, value] of Object.entries(right.registration_refs)) if (typeof value === 'string') refs[key] = value;
        }
        songs.push({ id: track.id, title: track.title, artistName: track.artist_name,
          isrc: right?.isrc || dist?.isrc || '', iswc: right?.iswc ?? '', publisher: right?.publisher || release?.publisher_name || '',
          writers: [...ownSplits.filter(s => s.role === 'writer' || s.role === 'composer').map(s => s.name), ...(release?.songwriters ?? [])],
          splitPercent: splitTotal(ownSplits), registrationRefs: refs, proAffiliation: release?.pro_affiliation ?? '',
        });
      }
    }
    const { getIntegrationStatus } = await import('./rights-integrations.server');
    const coverage = RIGHTS_ORGS.map(org => ({ organization: org.key, status: 'not_checked', reason: getIntegrationStatus(org.key).reason }));
    const findings = auditCatalog(songs);
    const saved = await sb.rpc('save_royalty_catalog_scan', { p_track_ids: tracks.map(t => t.id), p_findings: findings, p_coverage: coverage, ...(data.trackId ? { p_track_id: data.trackId } : {}) });
    if (saved.error || !saved.data) throw new Error('Could not save your scan');
    return { scanId: saved.data };
  });