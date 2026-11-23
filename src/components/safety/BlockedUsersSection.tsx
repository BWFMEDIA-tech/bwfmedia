import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { setPersonalBlock } from '@/lib/content-safety.functions';
import { Button } from '@/components/ui/button';
import { usePersonalBlocks } from './usePersonalBlocks';

export function BlockedUsersSection() {
  const blocks = usePersonalBlocks();
  const auth = useAuth();
  const qc = useQueryClient();
  const unblock = useServerFn(setPersonalBlock);
  const [busy, setBusy] = useState<string | null>(null);
  const ids = blocks.data?.blockedIds ?? [];
  const profiles = useQuery({ queryKey: ['blocked-profile-names', auth.user?.id, ids], enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('public_profiles').select('id, display_name').in('id', ids);
      if (error) throw new Error('Unable to load names');
      return data ?? [];
    },
  });
  const remove = async (userId: string) => {
    setBusy(userId);
    try { await unblock({ data: { userId, blocked: false } }); await qc.invalidateQueries({ queryKey: ['personal-blocks', auth.user?.id] }); toast.success('User unblocked'); }
    catch { toast.error('Unable to unblock this user'); }
    finally { setBusy(null); }
  };
  if (!auth.user) return null;
  return <section className="border-t border-border py-6">
    <h2 className="mb-4 text-lg font-semibold text-foreground">Blocked users</h2>
    {blocks.isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : blocks.isError ? <Button variant="outline" onClick={() => void blocks.refetch()}>Retry blocked users</Button> : ids.length === 0 ? <p className="text-sm text-muted-foreground">No blocked users.</p> : <ul className="divide-y divide-border">{ids.map(id => <li key={id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate text-sm">{profiles.data?.find(profile => profile.id === id)?.display_name ?? 'Blocked account'}</span><Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void remove(id)}>{busy === id ? 'Saving…' : 'Unblock'}</Button></li>)}</ul>}
  </section>;
}