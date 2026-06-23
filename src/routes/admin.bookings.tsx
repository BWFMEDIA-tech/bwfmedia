import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Camera, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings - Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBookingsHub,
});

function AdminBookingsHub() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studioCount, setStudioCount] = useState<number | null>(null);
  const [blockCount, setBlockCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
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
      if (roleRow) {
        const [s, b] = await Promise.all([
          supabase.from("studio_bookings").select("id", { count: "exact", head: true }),
          supabase.from("block_bookings").select("id", { count: "exact", head: true }),
        ]);
        if (mounted) {
          setStudioCount(s.count ?? 0);
          setBlockCount(b.count ?? 0);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

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
            <h1 className="text-xl font-semibold text-foreground">Bookings</h1>
            <p className="text-xs text-muted-foreground">
              Choose a booking category to manage
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid gap-5 sm:grid-cols-2">
        <BookingCard
          to="/admin/studio-bookings"
          icon={<Calendar className="h-5 w-5" />}
          title="Studio Bookings"
          description="Recording and production sessions booked through Stream Studio."
          count={studioCount}
        />
        <BookingCard
          to="/admin/block-bookings"
          icon={<Camera className="h-5 w-5" />}
          title="Off The Block Bookings"
          description="Shoot requests for Off The Block locations and crews."
          count={blockCount}
        />
      </main>
    </div>
  );
}

function BookingCard({
  to,
  icon,
  title,
  description,
  count,
}: {
  to: "/admin/studio-bookings" | "/admin/block-bookings";
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number | null;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-6 transition hover:border-foreground/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-foreground">
            {icon}
          </div>
          <div>
            <div className="font-semibold text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">
              {count == null ? "—" : `${count} total`}
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}