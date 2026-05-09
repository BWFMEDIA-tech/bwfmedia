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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

type Status =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "delivered"
  | "cancelled";

const STATUS_OPTIONS: Status[] = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "delivered",
  "cancelled",
];

type BookingTable = "studio_bookings" | "block_bookings";

interface BaseBooking {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: string;
  package_id: string | null;
  amount_cents: number | null;
  amount_paid_cents: number | null;
  paid_at: string | null;
}

interface StudioBooking extends BaseBooking {
  session_type: string;
  crew_size: string;
  duration: string;
}

interface BlockBooking extends BaseBooking {
  shoot_type: string;
  location: string;
}

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Studio Bookings - Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studio, setStudio] = useState<StudioBooking[]>([]);
  const [block, setBlock] = useState<BlockBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState<BookingTable>("studio_bookings");

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
      if (roleRow) loadAll();
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

  async function loadAll() {
    setLoading(true);
    const [s, b] = await Promise.all([
      supabase
        .from("studio_bookings")
        .select("*")
        .order("preferred_date", { ascending: false }),
      supabase
        .from("block_bookings")
        .select("*")
        .order("preferred_date", { ascending: false }),
    ]);
    if (s.error) toast.error(s.error.message);
    else setStudio((s.data ?? []) as StudioBooking[]);
    if (b.error) toast.error(b.error.message);
    else setBlock((b.data ?? []) as BlockBooking[]);
    setLoading(false);
  }

  async function updateStatus(table: BookingTable, id: string, status: Status) {
    setUpdatingId(id);
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    setUpdatingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (table === "studio_bookings") {
      setStudio((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } else {
      setBlock((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    }
    toast.success(`Marked as ${status}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  const activeRows: BaseBooking[] = tab === "studio_bookings" ? studio : block;

  const filteredStudio = useMemo(
    () => filterRows(studio, statusFilter, search, ["session_type"]),
    [studio, statusFilter, search],
  );
  const filteredBlock = useMemo(
    () => filterRows(block, statusFilter, search, ["shoot_type", "location"]),
    [block, statusFilter, search],
  );

  const counts = useMemo(() => {
    const rows = activeRows;
    return {
      all: rows.length,
      pending: rows.filter((b) => b.status === "pending").length,
      awaiting_payment: rows.filter((b) => b.status === "awaiting_payment").length,
      confirmed: rows.filter((b) => b.status === "confirmed").length,
      delivered: rows.filter((b) => b.status === "delivered").length,
      cancelled: rows.filter((b) => b.status === "cancelled").length,
    };
  }, [activeRows]);

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
            <h1 className="text-xl font-semibold text-foreground">Bookings</h1>
            <p className="text-xs text-muted-foreground">
              Review, filter and update booking + payment status
            </p>
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as BookingTable)}>
          <TabsList>
            <TabsTrigger value="studio_bookings">
              Studio ({studio.length})
            </TabsTrigger>
            <TabsTrigger value="block_bookings">
              Off The Block ({block.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-3 items-center mt-6">
          <Input
            placeholder="Search name, email, session type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({counts.all})</SelectItem>
              <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
              <SelectItem value="awaiting_payment">
                Awaiting payment ({counts.awaiting_payment})
              </SelectItem>
              <SelectItem value="confirmed">Confirmed ({counts.confirmed})</SelectItem>
              <SelectItem value="delivered">Delivered ({counts.delivered})</SelectItem>
              <SelectItem value="cancelled">Cancelled ({counts.cancelled})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          </div>

          <TabsContent value="studio_bookings" className="mt-6">
            <BookingsTable
              loading={loading}
              rows={filteredStudio}
              updatingId={updatingId}
              onStatusChange={(id, s) => updateStatus("studio_bookings", id, s)}
              renderDetailHead={() => (
                <>
                  <TableHead>Session</TableHead>
                  <TableHead>Crew · Duration</TableHead>
                </>
              )}
              renderDetailCells={(row) => {
                const r = row as StudioBooking;
                return (
                  <>
                    <TableCell>
                      <div className="text-sm">{r.session_type}</div>
                      {r.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs mt-1">
                          {r.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.crew_size} · {r.duration}
                    </TableCell>
                  </>
                );
              }}
            />
          </TabsContent>

          <TabsContent value="block_bookings" className="mt-6">
            <BookingsTable
              loading={loading}
              rows={filteredBlock}
              updatingId={updatingId}
              onStatusChange={(id, s) => updateStatus("block_bookings", id, s)}
              renderDetailHead={() => (
                <>
                  <TableHead>Shoot</TableHead>
                  <TableHead>Location</TableHead>
                </>
              )}
              renderDetailCells={(row) => {
                const r = row as BlockBooking;
                return (
                  <>
                    <TableCell>
                      <div className="text-sm">{r.shoot_type}</div>
                      {r.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs mt-1">
                          {r.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.location}</TableCell>
                  </>
                );
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "confirmed" || status === "delivered"
      ? "default"
      : status === "cancelled"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

function PaymentCell({ row }: { row: BaseBooking }) {
  const paid = !!row.paid_at;
  const amount = row.amount_paid_cents ?? row.amount_cents ?? null;
  const formatted =
    amount != null ? `$${(amount / 100).toFixed(2)}` : "—";
  return (
    <div>
      <Badge variant={paid ? "default" : "secondary"}>
        {paid ? "Paid" : row.status === "awaiting_payment" ? "Awaiting" : "Unpaid"}
      </Badge>
      <div className="text-xs text-muted-foreground mt-1">
        {formatted}
        {row.package_id && <span className="ml-1">· {row.package_id}</span>}
      </div>
      {row.paid_at && (
        <div className="text-[10px] text-muted-foreground">
          {format(new Date(row.paid_at), "MMM d, yyyy")}
        </div>
      )}
    </div>
  );
}

function BookingsTable({
  loading,
  rows,
  updatingId,
  onStatusChange,
  renderDetailHead,
  renderDetailCells,
}: {
  loading: boolean;
  rows: BaseBooking[];
  updatingId: string | null;
  onStatusChange: (id: string, status: Status) => void;
  renderDetailHead: () => React.ReactNode;
  renderDetailCells: (row: BaseBooking) => React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {renderDetailHead()}
            <TableHead>Date / Time</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                Loading bookings…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No bookings match your filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{b.full_name}</div>
                  <div className="text-xs text-muted-foreground">{b.email}</div>
                  {b.phone && <div className="text-xs text-muted-foreground">{b.phone}</div>}
                </TableCell>
                {renderDetailCells(b)}
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(b.preferred_date), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">{b.preferred_time}</div>
                </TableCell>
                <TableCell><PaymentCell row={b} /></TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Select
                    value={b.status}
                    onValueChange={(v) => onStatusChange(b.id, v as Status)}
                    disabled={updatingId === b.id}
                  >
                    <SelectTrigger className="w-[170px] ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function filterRows<T extends BaseBooking>(
  rows: T[],
  statusFilter: Status | "all",
  search: string,
  extraFields: (keyof T)[],
): T[] {
  return rows.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [
        b.full_name,
        b.email,
        ...extraFields.map((f) => String(b[f] ?? "")),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}