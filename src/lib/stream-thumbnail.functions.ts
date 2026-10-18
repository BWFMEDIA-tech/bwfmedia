// @auth-exempt: signs only the exact thumbnail referenced by a public live stream.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { streamThumbnailPath } from './stream-thumbnail';

export const signLiveStreamThumbnail = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ url: z.string().max(2048) }).parse(input))
  .handler(async ({ data }) => {
    const path = streamThumbnailPath(data.url);
    if (!path) return { url: null as string | null };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: stream, error } = await supabaseAdmin.from('streams')
      .select('id').eq('thumbnail_url', data.url).eq('status', 'live').limit(1).maybeSingle();
    if (error || !stream) return { url: null as string | null };
    const { data: signed } = await supabaseAdmin.storage.from('videos').createSignedUrl(path, 3600);
    return { url: signed?.signedUrl ?? null };
  });
