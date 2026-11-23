import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useAuth } from '@/lib/auth-context';
import { getPersonalBlocks } from '@/lib/content-safety.functions';

export function usePersonalBlocks() {
  const auth = useAuth();
  const getBlocks = useServerFn(getPersonalBlocks);
  return useQuery({
    queryKey: ['personal-blocks', auth.user?.id],
    queryFn: () => getBlocks(),
    enabled: !!auth.user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}