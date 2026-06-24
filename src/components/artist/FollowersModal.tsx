import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listArtistFollowers } from "@/lib/artist-follows.functions";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { SignedImg } from "@/components/ui/signed-img";

const PAGE_SIZE = 20;

export function FollowersModal({
  artistId,
  open,
  onOpenChange,
}: {
  artistId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const fetchPage = useServerFn(listArtistFollowers);

  const q = useQuery({
    queryKey: ["artist-followers", artistId, page],
    queryFn: () => fetchPage({ data: { artistId, page, pageSize: PAGE_SIZE } }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const total = q.data?.total ?? 0;
  const totalPages = q.data?.totalPages ?? 1;
  const followers = q.data?.followers ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPage(1);
      }}
    >
      <DialogContent className="bg-[#0c0c0e] border-white/10 text-white max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-[#FF00A6]" />
            Followers
            <span className="text-white/40 text-xs font-normal tabular-nums">
              {total.toLocaleString()}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-2 py-2 min-h-[260px]">
          {q.isLoading ? (
            <ul className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 p-2">
                  <div className="h-9 w-9 rounded-full bg-white/5 animate-pulse" />
                  <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                </li>
              ))}
            </ul>
          ) : followers.length === 0 ? (
            <div className="grid place-items-center h-[220px] text-sm text-white/50">
              No followers yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {followers.map((f) => {
                const initials = (f.displayName ?? "?")
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li key={f.id}>
                    <Link
                      to="/user/$id"
                      params={{ id: f.id }}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.04]"
                    >
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-zinc-700 to-zinc-900 grid place-items-center text-xs font-bold shrink-0">
                        {f.avatarUrl ? (
                          <SignedImg src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {f.displayName ?? "Anonymous fan"}
                        </div>
                        <div className="text-[11px] text-white/40">
                          Followed {new Date(f.followedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 text-xs text-white/60">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || q.isFetching}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
            {q.isFetching ? " · loading…" : ""}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || q.isFetching}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}