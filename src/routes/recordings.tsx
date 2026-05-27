import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMyRecordings, deleteRecording } from '@/lib/recordings.functions';
import { useAuth } from '@/lib/auth-context';
import { Trash2, Radio, ArrowLeft, Film } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/recordings')({
  head: () => ({
    meta: [
      { title: 'My Recordings — BWF Live' },
      { name: 'description', content: 'Watch and manage your saved BWF Live broadcasts.' },
    ],
  }),
  component: RecordingsPage,
});

function RecordingsPage() {
  const { user, loading } = useAuth();
  const fetchList = useServerFn(listMyRecordings);
  const del = useServerFn(deleteRecording);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-recordings', user?.id],
    queryFn: () => fetchList(),
    enabled: !!user,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success('Recording deleted'); qc.invalidateQueries({ queryKey: ['my-recordings'] }); },
    onError: (e: any) => toast.error(e?.message ?? 'Delete failed'),
  });

  if (loading) return <div className="min-h-screen bg-[#050509] text-white p-8">Loading…</div>;
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050509] text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Sign in to view your recordings</h1>
        <Link to="/login" className="text-purple-400 underline">Go to sign in</Link>
      </div>
    );
  }

  const recs = data?.recordings ?? [];

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/stream-studio" className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">
              <ArrowLeft className="h-3.5 w-3.5" /> Studio
            </Link>
            <h1 className="text-2xl font-black tracking-tight">My Recordings</h1>
          </div>
          <Link to="/stream-studio" className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-1.5 text-xs font-semibold">
            <Radio className="h-3.5 w-3.5" /> Go Live
          </Link>
        </div>

        {isLoading ? (
          <div className="text-white/60">Loading recordings…</div>
        ) : recs.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-12 text-center">
            <Film className="mx-auto mb-3 h-10 w-10 text-white/30" />
            <p className="text-white/70">No recordings yet. Start a stream and tap Record.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map((r) => (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d18]">
                {r.public_url && (
                  <video src={r.public_url} controls className="aspect-video w-full bg-black" preload="metadata" />
                )}
                <div className="flex items-center justify-between p-3 text-xs text-white/70">
                  <div>
                    <div className="text-white">{fmtDuration(r.duration_seconds ?? 0)}</div>
                    <div className="text-[10px] text-white/40">
                      {fmtSize(r.size_bytes ?? 0)} · {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMut.mutate(r.id)}
                    disabled={removeMut.isPending}
                    className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
function fmtSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}