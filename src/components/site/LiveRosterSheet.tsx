import { Link } from "@tanstack/react-router";
import { Eye, Radio, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SignedImg } from "@/components/ui/signed-img";
import { liveCategoryLabel } from "@/lib/live-categories";
import { liveRosterCountLabel, liveRosterHostName, type LiveRosterRow } from "@/lib/live-roster";
import { useLiveRoster } from "@/lib/use-live-stage-navigation";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** The list of people live on Tunevio, opened from the phone menu's Live Arena button. */
export function LiveRosterSheet({ open, onOpenChange }: Props) {
  const { rows, isLoading, isError, retry } = useLiveRoster();
  const close = () => onOpenChange(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent
        id="live-roster"
        className="live-roster-drawer border-t border-border bg-background"
        aria-label="People live on Tunevio"
      >
        <DrawerHeader className="pb-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                Live on Tunevio
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-xs">
                {isLoading ? "Checking who's live…" : isError ? "Couldn't load the live list." : liveRosterCountLabel(rows)}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Close live list">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <ul className="space-y-2 py-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />
              ))}
            </ul>
          ) : isError ? (
            <div className="my-6 rounded-2xl border border-border bg-secondary p-6 text-center">
              <p className="text-sm text-muted-foreground">Couldn't load the people who are live.</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={retry}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="my-6 rounded-2xl border border-border bg-secondary p-8 text-center">
              <Radio className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No one's live right now.</p>
              <p className="mt-1 text-xs text-muted-foreground">Check back soon — or start your own stream.</p>
            </div>
          ) : (
            <ul className="space-y-2 py-2">
              {rows.map((row) => (
                <LiveRosterItem key={`${row.kind ?? "stream"}-${row.id}`} row={row} onEnter={close} />
              ))}
            </ul>
          )}
        </div>

        <DrawerFooter className="gap-2 pt-3">
          <DrawerClose asChild>
            <Button asChild variant="ghost" size="sm" className="w-full rounded-full text-xs">
              <Link to="/live">See the full live page</Link>
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function LiveRosterItem({ row, onEnter }: { row: LiveRosterRow; onEnter: () => void }) {
  const name = liveRosterHostName(row);
  return (
    <li>
      <Link
        {...row.destination}
        onClick={onEnter}
        className="flex items-center gap-3 rounded-2xl border border-border bg-secondary p-3 transition-colors hover:border-primary/50"
      >
        {row.host?.avatar_url ? (
          <SignedImg src={row.host.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-secondary to-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{name}</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-destructive-foreground">
              <span aria-hidden className="h-1 w-1 animate-pulse rounded-full bg-destructive-foreground" /> LIVE
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.title || "Live on Tunevio"}</span>
          {row.category && (
            <span className="mt-1.5 inline-block rounded-md border border-border px-1.5 py-0.5 text-[9px] font-semibold text-primary">
              {liveCategoryLabel(row.category)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Eye className="h-3 w-3" /> {row.viewer_count ?? 0}
        </span>
      </Link>
    </li>
  );
}
