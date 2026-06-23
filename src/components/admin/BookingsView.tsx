import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
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

export type BookingStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "delivered"
  | "cancelled";

const STATUS_OPTIONS: BookingStatus[] = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "delivered",
  "cancelled",
];

export interface BaseBooking {
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

export type BookingTableName = "studio_bookings" | "block_bookings";

interface BookingsViewProps<T extends BaseBooking> {
  table: BookingTableName;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchFields: (keyof T)[];
  renderDetailHead: () => ReactNode;
  renderDetailCells: (row: T) => ReactNode;
}

export function BookingsView<T extends BaseBooking>({
  table,
  title,
  subtitle,
  searchPlaceholder,
  searchFields,
  renderDetailHead,
  renderDetailCells,
}: BookingsViewProps<T>) {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
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

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("preferred_date", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as T[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdatingId(id);
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    setUpdatingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    toast.success(`Marked as ${status}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  const filtered = useMemo(
    () =>
      rows.filter((b) => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const haystack = [
            b.full_name,
            b.email,
            ...searchFields.map((f) => String(b[f] ?? "")),
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      }),
    [rows, statusFilter, search, searchFields],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((b) => b.status === "pending").length,
      awaiting_payment: rows.filter((b) => b.status === "awaiting_payment").length,
      confirmed: rows.filter((b) => b.status === "confirmed").length,
      delivered: rows.filter((b) => b.status === "delivered").length,
      cancelled: rows.filter((b) => b.status === "cancelled").length,
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
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/bookings">All bookings</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder={searchPlaceholder}
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
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No bookings match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{b.full_name}</div>
                      <div className="text-xs text-muted-foreground">{b.email}</div>
                      {b.phone && (
                        <div className="text-xs text-muted-foreground">{b.phone}</div>
                      )}
                    </TableCell>
                    {renderDetailCells(b)}
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(b.preferred_date), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">{b.preferred_time}</div>
                    </TableCell>
                    <TableCell><PaymentCell row={b} /></TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={b.status}
                        onValueChange={(v) => updateStatus(b.id, v as BookingStatus)}
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
  const formatted = amount != null ? `$${(amount / 100).toFixed(2)}` : "—";
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