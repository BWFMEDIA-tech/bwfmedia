import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ScanSearch, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRoyaltyScans, getRoyaltyFindings, scanRoyaltyCatalog, resolveRoyaltyFinding } from '@/lib/royalty-finder.functions';
import { RIGHTS_ORGS, type OrgKey } from '@/lib/rights';
import { OFFICIAL_SEARCH } from '@/lib/royalty-finder';

export function RoyaltyFinder({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const scan = useServerFn(scanRoyaltyCatalog), resolve = useServerFn(resolveRoyaltyFinding);
  const historyFn = useServerFn(getRoyaltyScans), findingsFn = useServerFn(getRoyaltyFindings);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [org, setOrg] = useState('all');
  const [state, setState] = useState('all');
  const [search, setSearch] = useState('');
  const history = useQuery({ queryKey: ['royalty-scans', userId], queryFn: () => historyFn() });
  const active = selected ?? history.data?.[0]?.id;
  const current = history.data?.find(s => s.id === active);
  const results = useQuery({ queryKey: ['royalty-findings', userId, active, page], enabled: !!active, queryFn: () => active ? findingsFn({ data: { scanId: active, page } }) : Promise.resolve({ findings: [], total: 0 }) });
  const run = async (trackId?: string) => {
    setBusy(true);
    try {
      const result = await scan({ data: trackId ? { trackId } : {} });
      setSelected(result.scanId); setPage(0);
      await qc.invalidateQueries({ queryKey: ['royalty-scans', userId] });
      toast.success(trackId ? 'Song rescan saved' : 'Catalog scan saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Scan failed'); }
    finally { setBusy(false); }
  };
  const toggle = async (id: string, resolved: boolean) => {
    setBusy(true);
    try { await resolve({ data: { id, resolved } }); await qc.invalidateQueries({ queryKey: ['royalty-findings', userId] }); }
    catch { toast.error('Could not update finding'); }
    finally { setBusy(false); }
  };
  const filtered = (results.data?.findings ?? []).filter(f => (org === 'all' || f.organization === org) && (state === 'all' || f.resolved === (state === 'resolved')) && `${f.song_title} ${f.artist_name} ${f.issue_type}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="min-w-0 space-y-4 border-y border-border py-6" aria-label="Royalty Finder">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><ScanSearch className="h-5 w-5 text-primary" />Royalty Finder</h2>
      <Button disabled={busy} onClick={() => run()}><ScanSearch className="h-4 w-4" />{busy ? 'Working…' : 'Scan My Catalog'}</Button>
    </div>
    <p className="text-sm text-muted-foreground">Catalog metadata checks only. Official databases have not been checked: authorized organization access is not connected. Findings are not proof of missing registrations or royalties owed.</p>
    {history.isError ? <div role="alert" className="text-sm text-destructive">Scan history could not load. <Button variant="link" onClick={() => history.refetch()}>Retry</Button></div> : history.isLoading ? <p role="status">Loading scan history…</p> : !history.data?.length ? <p className="text-sm text-muted-foreground">No catalog scans yet.</p> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={active} onValueChange={value => { setSelected(value); setPage(0); }}><SelectTrigger aria-label="Scan history"><SelectValue /></SelectTrigger><SelectContent>{history.data.map((s, i) => <SelectItem key={s.id} value={s.id}>{i === 0 ? 'Latest · ' : ''}{new Date(s.created_at).toLocaleString()} · {s.track_id ? 'Song' : 'Catalog'}</SelectItem>)}</SelectContent></Select>
        <Select value={org} onValueChange={setOrg}><SelectTrigger aria-label="Organization filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All organizations</SelectItem><SelectItem value="catalog">Catalog metadata</SelectItem>{RIGHTS_ORGS.map(o => <SelectItem key={o.key} value={o.key}>{o.name}</SelectItem>)}</SelectContent></Select>
        <Select value={state} onValueChange={setState}><SelectTrigger aria-label="Finding status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All findings</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="resolved">Resolved by you</SelectItem></SelectContent></Select>
        <Input aria-label="Search findings" placeholder="Search songs or issues" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-5 text-sm"><span><strong>{current?.total_tracks_scanned ?? 0}</strong> songs scanned</span><span><strong>{current?.findings_count ?? 0}</strong> findings</span><span className="text-muted-foreground">External match confidence: Not assessed</span></div>
      {results.isError ? <div role="alert">Could not load findings. <Button variant="link" onClick={() => results.refetch()}>Retry</Button></div> : results.isLoading ? <p role="status">Loading findings…</p> : <>
        <div className="divide-y divide-border">{filtered.map(f => {
          const organization = RIGHTS_ORGS.find(o => o.key === f.organization);
          return <article key={f.id} className="space-y-2 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold break-words">{f.song_title}</h3><p className="text-xs text-muted-foreground">{f.artist_name} · {organization?.name ?? 'Catalog metadata'}</p></div><span className={f.resolved ? 'text-sm text-primary' : 'text-sm text-muted-foreground'}>{f.resolved ? 'Resolved by you' : 'Open'}</span></div>
            <p className="text-sm font-medium">{f.issue_type}</p>
            <p className="break-words text-sm text-muted-foreground"><span className="text-foreground">Evidence:</span> {f.evidence}</p>
            <p className="text-sm text-muted-foreground">Source: {f.source} · Match confidence: Not assessed</p>
            <p className="text-sm">{f.recommended_action}</p>
            <div className="flex flex-wrap gap-2">
              {organization && <><Button size="sm" variant="outline" asChild><a href={OFFICIAL_SEARCH[f.organization as OrgKey]} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" />Official search</a></Button><Button size="sm" variant="ghost" asChild><a href={organization.url} target="_blank" rel="noopener noreferrer">Registration</a></Button></>}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => toggle(f.id, !f.resolved)}><Check className="h-3 w-3" />{f.resolved ? 'Reopen' : 'Mark resolved'}</Button>
              {f.track_id && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (f.track_id) void run(f.track_id); }}><RefreshCw className="h-3 w-3" />Rescan song</Button>}
            </div>
          </article>;
        })}</div>
        {!filtered.length && <p className="py-3 text-sm text-muted-foreground">{results.data?.total ? 'No matching findings on this page.' : 'No metadata issues found. Official registrations remain unchecked.'}</p>}
        {(results.data?.total ?? 0) > 50 && <div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-sm">Page {page + 1}</span><Button size="sm" variant="outline" disabled={(page + 1) * 50 >= (results.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
      </>}
    </>}
  </section>;
}