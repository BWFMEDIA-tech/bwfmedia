import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { CertificationDashboard } from "@/components/certifications/CertificationDashboard";
import { getMyCertificationDashboard } from "@/lib/certifications.functions";
import { useAuth } from "@/lib/auth-context";

const meta = "Track your verified Tunevio streams toward Bronze, Silver, Gold, Platinum and Diamond certifications.";
export const Route = createFileRoute("/certifications")({
  head: () => ({ meta: [
    { title: "Certifications & Milestones — Tunevio" }, { name: "description", content: meta },
    { property: "og:title", content: "Certifications & Milestones — Tunevio" }, { property: "og:description", content: meta },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CertificationsPage,
});

function CertificationsPage() {
  const auth = useAuth();
  const load = useServerFn(getMyCertificationDashboard);
  const q = useQuery({ queryKey: ["my-certifications", auth.user?.id], queryFn: () => load(), enabled: !!auth.user });
  return <ArtistDashboardShell><div className="mx-auto max-w-6xl p-4 md:p-8">
    {!auth.user ? <p>Please <Link to="/login" className="underline">sign in</Link> to view your certifications.</p>
      : q.isLoading ? <p className="text-muted-foreground">Loading your milestones…</p>
      : q.error ? <p className="text-destructive">{(q.error as Error).message}</p>
      : q.data && <CertificationDashboard data={q.data as any} />}
  </div></ArtistDashboardShell>;
}
