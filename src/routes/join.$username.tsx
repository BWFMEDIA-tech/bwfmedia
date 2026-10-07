import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { resolveJoinCode } from "@/lib/artist-referrals.functions";
import { saveHostReferral } from "@/lib/host-referral";

export const Route = createFileRoute("/join/$username")({
  head: () => ({
    meta: [
      { title: "Join Tunevio as an Artist" },
      { name: "description", content: "You've been invited to join Tunevio — stream your music, go live and grow your fanbase." },
      { property: "og:title", content: "Join Tunevio as an Artist" },
      { property: "og:description", content: "You've been invited to join Tunevio — stream your music, go live and grow your fanbase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { username } = Route.useParams();
  const nav = useNavigate();
  const resolve = useServerFn(resolveJoinCode);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    resolve({ data: { code: username } })
      .then((r) => {
        if (!r.hostId) { setMissing(true); return; }
        saveHostReferral({ hostId: r.hostId, source: "link" });
        nav({ to: "/signup", search: { as: "artist" } as any, replace: true });
      })
      .catch(() => setMissing(true));
  }, [username]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
      {missing ? (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">This invite link isn't active</h1>
          <a href="/signup" className="text-primary underline">Sign up to Tunevio</a>
        </div>
      ) : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </div>
  );
}
