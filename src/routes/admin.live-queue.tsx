import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { AudioPlayer } from "@/components/AudioUploader";

type QueueStatus = "queued" | "next_up" | "live" | "done";
type Tier = "basic" | "featured" | "premium";

interface Submission {
  id: string;
  created_at: string;
  artist_name: string;
  email: string;
  song_link: string;
  message: string | null;
  tier: Tier;
  amount_cents: number;
  status: string;
  queue_status: QueueStatus;
  paid_at: string | null;
  photo_url: string | null;
  song_title: string | null;
  uploaded_audio_url: string | null;
  audio_file_type: string | null;
}

export const Route = createFileRoute("/admin/live-queue")({
  head: () => ({
    meta: [
      { title: "Live Review Queue — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLiveQueuePage,
});

const TIER_RANK: Record<Tier, number> = { premium: 0, featured: 1, basic: 2 };
const QUEUE_RANK: Record<QueueStatus, number> = { live: 0, next_up: 1, queued: 2, done: 3 };

function AdminLiveQueuePage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [queueFilter, setQueueFilter] = useState<QueueStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!mounted) return;
      setIsAdmin(!!roleRow);
      setAuthChecked(true);
      if (roleRow) load();
      else setLoading(false);
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/admin/login" });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: refresh whenever a submission row changes.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-live-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_submissions" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("live_submissions")
      .select("*")
      .eq("status", "paid")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Submission[]);
    setLoading(false);
  }

  async function updateQueue(id: string, next: QueueStatus) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("live_submissions")
      .update({ queue_status: next })
      .eq("id", id);
    setUpdatingId(null);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, queue_status: next } : r)));
    toast.success(`Marked ${next.replace("_", " ")}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        if (tierFilter !== "all" && r.tier !== tierFilter) return false;
        if (queueFilter !== "all" && r.queue_status !== queueFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !r.artist_name.toLowerCase().includes(q) &&
            !r.email.toLowerCase().includes(q) &&
            !(r.message ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        const q = QUEUE_RANK[a.queue_status] - QUEUE_RANK[b.queue_status];
        if (q !== 0) return q;
        return TIER_RANK[a.tier] - TIER_RANK[b.tier];
      });
  }, [rows, tierFilter, queueFilter, search]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      queued: rows.filter((r) => r.queue_status === "queued").length,
      next_up: rows.filter((r) => r.queue_status === "next_up").length,
      live: rows.filter((r) => r.queue_status === "live").length,
      done: rows.filter((r) => r.queue_status === "done").length,
    }),
    [rows],
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Not authorized</h1>
          <p className="text-sm text-muted-foreground">
            Your account does not have admin access.
          </p>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Live Review Queue</h1>
            <p className="text-xs text-muted-foreground">
              Paid submissions — manage who's next up and live.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/live-review">View live page</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/bookings">Bookings</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search artist, email, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={queueFilter} onValueChange={(v) => setQueueFilter(v as any)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({counts.all})</SelectItem>
              <SelectItem value="live">Now Live ({counts.live})</SelectItem>
              <SelectItem value="next_up">Next Up ({counts.next_up})</SelectItem>
              <SelectItem value="queued">Queued ({counts.queued})</SelectItem>
              <SelectItem value="done">Done ({counts.done})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Song</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading submissions…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No paid submissions match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {r.photo_url ? (
                          <img
                            src={r.photo_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted grid place-items-center text-xs font-medium text-muted-foreground">
                            {r.artist_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground">
                            <Link
                              to="/artist/$id"
                              params={{ id: r.id }}
                              className="hover:underline"
                            >
                              {r.artist_name}
                            </Link>
                          </div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={r.tier} />
                      <div className="text-xs text-muted-foreground mt-1">
                        ${(r.amount_cents / 100).toFixed(0)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {r.song_title && (
                        <div className="text-sm text-foreground font-medium">
                          "{r.song_title}"
                        </div>
                      )}
                      <a
                        href={r.song_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm underline-offset-4 hover:underline break-all"
                      >
                        {r.song_link}
                      </a>
                      {r.message && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {r.message}
                        </div>
                      )}
                      {r.uploaded_audio_url && (
                        <div className="mt-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            Uploaded Track
                          </div>
                          <AudioPlayer src={r.uploaded_audio_url} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.paid_at ? format(new Date(r.paid_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <QueueBadge status={r.queue_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={r.queue_status}
                        onValueChange={(v) => updateQueue(r.id, v as QueueStatus)}
                        disabled={updatingId === r.id}
                      >
                        <SelectTrigger className="w-[160px] ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="queued">Queued</SelectItem>
                          <SelectItem value="next_up">Next Up</SelectItem>
                          <SelectItem value="live">Now Live</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const variant =
    tier === "premium" ? "default" : tier === "featured" ? "secondary" : "outline";
  return <Badge variant={variant}>{tier}</Badge>;
}

function QueueBadge({ status }: { status: QueueStatus }) {
  const variant =
    status === "live"
      ? "destructive"
      : status === "next_up"
        ? "default"
        : status === "done"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}