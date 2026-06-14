import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const SaveSchema = z.object({
  streamId: z.string().uuid(),
  storagePath: z.string().min(1).max(500),
  publicUrl: z.string().url().optional().nullable(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 12),
  sizeBytes: z.number().int().min(0).max(5_000_000_000),
});

export const saveRecording = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Path ownership guard: the storage_path MUST be inside the caller's
    // user-id-prefixed folder. Prevents a host from claiming another host's
    // recording path and then minting a signed URL for it via
    // getRecordingSignedUrl (which uses the service-role client).
    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error('Invalid storage path');
    }
    const { data: row, error } = await supabase
      .from('stream_recordings')
      .insert({
        stream_id: data.streamId,
        host_id: userId,
        storage_path: data.storagePath,
        public_url: data.publicUrl ?? null,
        duration_seconds: data.durationSeconds,
        size_bytes: data.sizeBytes,
        status: 'ready',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listMyRecordings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from('stream_recordings')
      .select('id, stream_id, storage_path, duration_seconds, size_bytes, created_at, status')
      .eq('host_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { recordings: data ?? [] };
  });

export const deleteRecording = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from('stream_recordings')
      .delete()
      .eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRecordingSignedUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS ensures only host or admin can read the row.
    const { data: rec, error } = await supabase
      .from('stream_recordings')
      .select('id, storage_path, host_id')
      .eq('id', data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec) throw new Error('Recording not found');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from('stream-recordings')
      .createSignedUrl(rec.storage_path, 60 * 60);
    if (sErr || !signed) throw new Error(sErr?.message ?? 'Could not sign URL');
    return { url: signed.signedUrl };
  });