import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useAuth } from '@/lib/auth-context';
import { getCancellationEmailLog } from '@/lib/cancellation-email-admin.functions';
import { AlertTriangle, CheckCircle2, Clock, Mail, RefreshCw, ShieldAlert } from 'lucide-react';

export const Route = createFileRoute('/admin/cancellation-emails')({
  head: () => ({ meta: [{ title: 'Cancellation Emails — Admin' }] }),
  component: AdminCancellationEmails,
});

type Entry = {
  id: string;
  message_id: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
  attempts: number;
  dedup_suppressed_retry: boolean;
};

type Stats = {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  suppressed: number;
  retry_collisions: number;
};

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  dlq: 'bg-red-500/15 text-red-300 border-red-500/30',
  suppressed: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
};

function AdminCancellationEmails() {
  const auth = useAuth();
  const navigate = useNavigate();
  const fetchLog = useServerFn(getCancellationEmailLog);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = auth.roles.includes('admin');

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !isAdmin) navigate({ to: '/' });
  }, [auth.loading, isAdmin]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLog();
      setEntries(res.entries as Entry[]);
      setStats(res.stats as Stats);
      setFetchedAt(res.fetched_at);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [fetchLog]);

  // Auto-refresh every 30s — light monitoring without external alerting.
  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [isAdmin, refresh]);

  if (auth.loading) return <div className="min-h-screen bg-[#050509] text-white p-6">Loading…</div>;
  if (!isAdmin) return null;

  const needsAttention = stats && stats.failed > 0;

  return (
    <div className="min-h-screen bg-[#050509] text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="size-6 text-amber-300" />
              Cancellation Emails
            </h1>
            <p className="text-sm text-white/60">
              Stripe-triggered <code className="text-white/80">checkout-cancellation</code> sends.
              Auto-refreshes every 30s.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="text-sm text-white/60 hover:text-white">
              ← Dashboard
            </Link>
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {needsAttention && (
          <div className="flex items-start gap-3 rounded border border-red-500/40 bg-red-500/10 p-4">
            <ShieldAlert className="size-5 text-red-300 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">
                {stats!.failed} failed cancellation email{stats!.failed === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-red-200/80">
                Investigate the rows marked <strong>failed</strong> or <strong>dlq</strong> below.
                A failed send means the recipient never got the email.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Unique emails" value={stats.total} icon={<Mail className="size-4" />} />
            <Stat label="Sent" value={stats.sent} tone="ok" icon={<CheckCircle2 className="size-4" />} />
            <Stat label="Pending" value={stats.pending} tone="warn" icon={<Clock className="size-4" />} />
            <Stat label="Failed" value={stats.failed} tone={stats.failed > 0 ? 'bad' : 'mute'} icon={<AlertTriangle className="size-4" />} />
            <Stat
              label="Retry collisions"
              value={stats.retry_collisions}
              tone="mute"
              icon={<RefreshCw className="size-4" />}
              hint="Stripe retries blocked by idempotency guard"
            />
          </div>
        )}

        <div className="overflow-hidden rounded border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Stripe ref</th>
                <th className="px-3 py-2">Attempts</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/50">
                    No cancellation emails yet.
                  </td>
                </tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white/70 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[e.status] ?? 'border-white/15 bg-white/5 text-white/70'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/80">{e.recipient_email}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">
                    {e.metadata?.ref ?? e.message_id.replace(/^stripe-cancel-/, '')}
                  </td>
                  <td className="px-3 py-2">
                    <span className={e.dedup_suppressed_retry ? 'text-amber-300' : 'text-white/60'}>
                      {e.attempts}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-white/60">
                    {e.error_message && <span className="text-red-300">{e.error_message}</span>}
                    {e.dedup_suppressed_retry && !e.error_message && (
                      <span>Retry blocked by idempotency guard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {fetchedAt && (
          <p className="text-xs text-white/40">
            Last fetched {new Date(fetchedAt).toLocaleTimeString()}.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = 'mute',
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'ok' | 'warn' | 'bad' | 'mute';
  hint?: string;
}) {
  const toneCls = {
    ok: 'border-emerald-500/30 text-emerald-300',
    warn: 'border-amber-500/30 text-amber-300',
    bad: 'border-red-500/40 text-red-300',
    mute: 'border-white/10 text-white/80',
  }[tone];
  return (
    <div className={`rounded border ${toneCls} bg-white/[0.02] p-3`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="text-[10px] opacity-60 mt-0.5">{hint}</div>}
    </div>
  );
}