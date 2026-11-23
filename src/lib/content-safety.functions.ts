import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { blockInput, reportInput, reviewInput } from './content-safety';

export const getPersonalBlocks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('user_blocks').select('blocked_id').eq('blocker_id', context.userId);
    if (error) throw new Error('Unable to load blocked users');
    return { blockedIds: (data ?? []).map(row => row.blocked_id) };
  });

export const setPersonalBlock = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => blockInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error('You cannot block yourself');
    const result = data.blocked
      ? await context.supabase.from('user_blocks').upsert({ blocker_id: context.userId, blocked_id: data.userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
      : await context.supabase.from('user_blocks').delete().eq('blocker_id', context.userId).eq('blocked_id', data.userId);
    if (result.error) throw new Error('Unable to update this block. Please try again.');
    return { blocked: data.blocked };
  });

export const submitContentReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: report, error } = await context.supabase.from('moderation_reports').insert({
      reporter_id: context.userId, target_type: data.targetType, target_id: data.targetId,
      category: data.category, details: data.details,
    }).select('id').single();
    if (error || !report) {
      const message = error?.message ?? '';
      if (message.includes('already reported') || message.includes('Report limit') || message.includes('unavailable for reporting')) throw new Error(message);
      throw new Error('Unable to send your report. Please try again.');
    }
    return { id: report.id };
  });

export const listContentReports = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Admin access required');
    const { data, error } = await context.supabase.from('moderation_reports').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error('Unable to load reports');
    return { reports: data ?? [] };
  });

export const reviewContentReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Admin access required');
    const { data: row, error } = await context.supabase.from('moderation_reports').update({
      status: data.status, review_note: data.note,
    }).eq('id', data.id).select('id').single();
    if (error || !row) throw new Error('Unable to update this report');
    return { id: row.id };
  });