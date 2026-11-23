import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { listContentReports, reviewContentReport } from '@/lib/content-safety.functions';
import { Button } from '@/components/ui/button';
import { reviewInput } from '@/lib/content-safety';

export const Route = createFileRoute('/admin/reports')({
  head: () => ({ meta: [
    { title: 'Content Reports — TUNEVIO Admin' },
    { name: 'description', content: 'Review private Tunevio community safety reports.' },
    { property: 'og:title', content: 'Content Reports — TUNEVIO Admin' },
    { property: 'og:description', content: 'Review private Tunevio community safety reports.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }), component: ReportsPage,
});

function ReportsPage() {
  const auth = useAuth();
  const list = useServerFn(listContentReports);
  const review = useServerFn(reviewContentReport);
  const reports = useQuery({ queryKey: ['content-reports', auth.user?.id], queryFn: () => list(), enabled: auth.roles.includes('admin') });
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!auth.roles.includes('admin')) return null;
  const save = async (id: string, status: string, note: string) => {
    setBusy(id);
    try { await review({ data: reviewInput.parse({ id, status, note }) }); await reports.refetch(); toast.success('Report updated'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save'); }
    finally { setBusy(null); }
  };
  const visible = reports.data?.reports.filter(report => filter === 'all' || report.status === filter) ?? [];
  return <div className="text-foreground">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="flex items-center gap-2 text-2xl font-semibold"><Flag className="text-primary" />Content reports</h1><select aria-label="Report status filter" value={filter} onChange={event => setFilter(event.target.value)} className="rounded border border-input bg-background px-3 py-2 text-base">{['pending', 'reviewing', 'resolved', 'dismissed', 'all'].map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></div>
    {reports.isPending ? <p>Loading reports…</p> : reports.isError ? <div role="alert"><p>Unable to load reports.</p><Button variant="outline" onClick={() => void reports.refetch()}>Retry</Button></div> : <>
      <p className="mb-4 text-sm text-muted-foreground">{visible.length} reports · latest 200 submissions</p>
      {visible.length === 0 && <p className="py-8 text-sm text-muted-foreground">No reports in this view.</p>}
      <div className="space-y-4">{visible.map(report => <article key={report.id} className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><h2 className="font-semibold capitalize">{report.category} · {report.target_type.replace('_', ' ')}</h2><span className="text-muted-foreground">{new Date(report.created_at).toLocaleString()}</span></div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm">{report.evidence}</p>
        {report.details && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{report.details}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-primary">
          {report.target_user_id && <Link to="/artist/$id" params={{ id: report.target_user_id }}>View account</Link>}
          {report.category === 'copyright' && <Link to="/admin/rights">Rights review</Link>}
          {(report.target_type === 'stream' || report.target_type === 'live_message') && <Link to="/admin/streams">Manage live sessions</Link>}
          <Link to="/admin/users">User moderation</Link>
        </div>
        <label className="mt-4 block text-xs text-muted-foreground">Review note<textarea aria-label={`Review note ${report.id}`} maxLength={2000} rows={2} value={notes[report.id] ?? report.review_note} onChange={event => setNotes(previous => ({ ...previous, [report.id]: event.target.value }))} className="mt-2 w-full rounded border border-input bg-background p-2 text-base text-foreground" /></label>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-auto text-xs capitalize text-muted-foreground">{report.status}</span>{['reviewing', 'resolved', 'dismissed'].filter(status => status !== report.status).map(status => <Button key={status} size="sm" variant="outline" disabled={busy !== null} onClick={() => void save(report.id, status, notes[report.id] ?? report.review_note)}>{status === 'reviewing' ? 'Start review' : status === 'resolved' ? 'Resolve' : 'Dismiss'}</Button>)}</div>
      </article>)}</div>
    </>}
  </div>;
}