import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const commentText = z.string().trim().min(1, 'Write a comment first').max(2000, 'Keep comments under 2,000 characters');
const vote = z.enum(['like', 'dislike']).nullable();
export type VideoComment = {
  id: string; user_id: string; parent_id: string | null; body: string; created_at: string; updated_at: string;
  display_name: string | null; username: string | null; avatar_url: string | null;
  likes: number; dislikes: number; reaction: 'like' | 'dislike' | null; replies: number;
};
export type VideoEngagement = { likes: number; dislikes: number; reaction: 'like' | 'dislike' | null; saved: boolean; total: number; pageTotal: number; comments: VideoComment[] };

export const getVideoDetail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: video, error } = await context.supabase.from('videos').select('*').eq('id', data.id).maybeSingle();
    if (error) throw error;
    if (!video) return { video: null, artist: null };
    const { data: artist, error: profileError } = await context.supabase.from('profiles').select('id, public_id, display_name, stage_name, username, avatar_url').eq('id', video.user_id).maybeSingle();
    if (profileError) throw profileError;
    return { video, artist };
  });

export const getVideoEngagement = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: z.string().uuid(), sort: z.enum(['top','newest']).default('top'), offset: z.number().int().min(0).max(100000).default(0), parentId: z.string().uuid().nullable().default(null) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('get_video_engagement', { p_video_id: data.videoId, p_sort: data.sort, p_offset: data.offset, p_parent_id: data.parentId ?? undefined });
    if (error) throw error;
    if (!result) throw new Error('Video not available');
    return result as unknown as VideoEngagement;
  });

export const setVideoReaction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: z.string().uuid(), reaction: vote }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const result = data.reaction
      ? await db.from('video_reactions').upsert({ video_id: data.videoId, user_id: context.userId, reaction: data.reaction }, { onConflict: 'video_id,user_id' })
      : await db.from('video_reactions').delete().eq('video_id', data.videoId).eq('user_id', context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });

export const setVideoSaved = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: z.string().uuid(), saved: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const result = data.saved
      ? await context.supabase.from('video_saves').upsert({ video_id: data.videoId, user_id: context.userId }, { onConflict: 'video_id,user_id', ignoreDuplicates: true })
      : await context.supabase.from('video_saves').delete().eq('video_id', data.videoId).eq('user_id', context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });

export const getSavedVideos = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('video_saves').select('video_id, videos(id,title,artist)').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
});

export const postVideoComment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), videoId: z.string().uuid(), parentId: z.string().uuid().nullable(), body: commentText }).parse(d))
  .handler(async ({ data, context }) => {
    // Client request ID is reused on retries; a successful retry never posts twice.
    const { data: existing, error: readError } = await context.supabase.from('video_comments').select('id,user_id').eq('id', data.id).maybeSingle();
    if (readError) throw readError;
    if (existing?.user_id === context.userId) return { id: existing.id };
    const { error } = await context.supabase.from('video_comments').insert({ id: data.id, user_id: context.userId, video_id: data.videoId, parent_id: data.parentId, body: data.body });
    if (error) {
      // Concurrent retry: the primary key is the final duplicate guard.
      if (error.code === '23505') return { id: data.id };
      throw error;
    }
    return { id: data.id };
  });

export const editVideoComment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), body: commentText }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('video_comments').update({ body: data.body }).eq('id', data.id).eq('user_id', context.userId).select('id').maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('You can only edit your own comments');
    return { ok: true };
  });

export const deleteVideoComment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('video_comments').delete().eq('id', data.id).select('id').maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('You cannot delete this comment');
    return { ok: true };
  });

export const setCommentReaction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ commentId: z.string().uuid(), reaction: vote }).parse(d))
  .handler(async ({ data, context }) => {
    const result = data.reaction
      ? await context.supabase.from('video_comment_reactions').upsert({ comment_id: data.commentId, user_id: context.userId, reaction: data.reaction }, { onConflict: 'comment_id,user_id' })
      : await context.supabase.from('video_comment_reactions').delete().eq('comment_id', data.commentId).eq('user_id', context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });