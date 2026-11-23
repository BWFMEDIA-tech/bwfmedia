import { useState, type ReactNode } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, Flag, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { reportCategories, reportInput, type ReportTarget } from '@/lib/content-safety';
import { setPersonalBlock, submitContentReport } from '@/lib/content-safety.functions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePersonalBlocks } from './usePersonalBlocks';

export function ContentSafetyMenu({ target, userId, label = 'Content', extraItems }: { target: ReportTarget; userId?: string; label?: string; extraItems?: ReactNode }) {
  const auth = useAuth();
  const blocks = usePersonalBlocks();
  const qc = useQueryClient();
  const report = useServerFn(submitContentReport);
  const block = useServerFn(setPersonalBlock);
  const [dialog, setDialog] = useState<'report' | 'block' | null>(null);
  const [category, setCategory] = useState('inappropriate');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const blocked = !!userId && (blocks.data?.blockedIds.includes(userId) ?? false);
  if (!auth.user && !extraItems) return null;
  const canBlock = !!auth.user && !!userId && userId !== auth.user.id;
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (dialog === 'report') {
        await report({ data: reportInput.parse({ ...target, category, details }) });
        toast.success('Report sent to TUNEVIO for review');
        setDetails('');
      } else if (dialog === 'block' && userId) {
        await block({ data: { userId, blocked: !blocked } });
        await qc.invalidateQueries({ queryKey: ['personal-blocks', auth.user?.id] });
        toast.success(blocked ? 'User unblocked' : 'User blocked');
      }
      setDialog(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Please try again'); }
    finally { setBusy(false); }
  };
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label={`Safety options: ${label}`} title={`Safety options: ${label}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[160]">
        {extraItems}
        <DropdownMenuItem onSelect={() => { if (!auth.user) { toast.error('Sign in to report content'); return; } setDialog('report'); }}><Flag />Report content</DropdownMenuItem>
        {canBlock && <DropdownMenuItem disabled={blocks.isPending || blocks.isError} onSelect={() => setDialog('block')}><Ban />{blocked ? 'Unblock user' : 'Block user'}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) setDialog(null); }}>
      <DialogContent className="z-[170] max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg" onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogTitle>{dialog === 'report' ? 'Report content' : blocked ? 'Unblock user?' : 'Block user?'}</DialogTitle>
        <DialogDescription>{dialog === 'report' ? label : blocked ? 'Private messaging will be available again and their live-chat messages will be visible.' : 'Their live-chat messages will be hidden for you. Neither of you can send new private messages to the other.'}</DialogDescription>
        {dialog === 'report' && <>
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Reason</legend>{reportCategories.map(item => <label key={item.value} className="flex min-h-10 items-center gap-3 rounded border border-border px-3 text-sm"><input type="radio" name="report-category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} className="accent-primary" />{item.label}</label>)}</fieldset>
          <label className="space-y-2 text-sm">Additional details (optional)<textarea aria-label="Report details" value={details} onChange={event => setDetails(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full rounded border border-input bg-background p-3 text-base" /></label>
        </>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : dialog === 'report' ? 'Send report' : blocked ? 'Unblock user' : 'Block user'}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}