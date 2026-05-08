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

type Status = "pending" | "confirmed" | "cancelled";

interface Booking {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  session_type: string;
  crew_size: string;
  duration: string;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: string;
}

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Studio Bookings — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
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
      if (roleRow) loadBookings();
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

  async function loadBookings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("studio_bookings")
      .select("*")
      .order("preferred_date", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setBookings((data ?? []) as Booking[]);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: Status) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("studio_bookings")
      .update({ status })
      .eq("id", id);
    setUpdatingId(null);
    if (error) {
      toast.error(error.message);
    } else {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      toast.success(`Marked as ${status}`);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !b.full_name.toLowerCase().includes(q) &&
          !b.email.toLowerCase().includes(q) &&
          !b.session_type.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [bookings, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

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
            Your account does not have admin access. Ask an existing admin to grant you the
            <code className="mx-1 px-1 py-0.5 rounded bg-muted">admin</code>
            role.
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
            <h1 className="text-xl font-semibold text-foreground">Studio Bookings</h1>
            <p className="text-xs text-muted-foreground">Review, filter and update booking status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/studio">View site</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search name, email, session type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({counts.all})</SelectItem>
              <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
              <SelectItem value="confirmed">Confirmed ({counts.confirmed})</SelectItem>
              <SelectItem value="cancelled">Cancelled ({counts.cancelled})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadBookings} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead>Crew · Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading bookings…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No bookings match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{b.full_name}</div>
                      <div className="text-xs text-muted-foreground">{b.email}</div>
                      {b.phone && <div className="text-xs text-muted-foreground">{b.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{b.session_type}</div>
                      {b.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs mt-1">
                          {b.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(b.preferred_date), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">{b.preferred_time}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.crew_size} · {b.duration}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={b.status}
                        onValueChange={(v) => updateStatus(b.id, v as Status)}
                        disabled={updatingId === b.id}
                      >
                        <SelectTrigger className="w-[140px] ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
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

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "confirmed"
      ? "default"
      : status === "cancelled"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}