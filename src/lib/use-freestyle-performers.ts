import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useAuth } from './auth-context';
import { getFreestyleQueue } from './freestyle.functions';

/** Shares the same authenticated queue cache as the battle UI; never grants media permissions. */
export function useFreestylePerformers(streamId: string) {
  const auth = useAuth();
  const read = useServerFn(getFreestyleQueue);
  const queue = useQuery({ queryKey: ['freestyle-queue', auth.user?.id], queryFn: () => read(), enabled: !!auth.user && !!streamId, refetchInterval: streamId ? 2000 : false });
  return new Set((queue.data?.challenges ?? []).filter(c => c.stream_id === streamId && ['accepted', 'scheduled', 'live'].includes(c.status)).flatMap(c => [c.artist_a_id, c.artist_b_id]));
}