import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImg } from "@/components/ui/signed-img";

export const Route = createFileRoute("/user/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `User Profile — BWF Network` },
      { name: "description", content: "BWF Network user profile." },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { id } = useParams({ from: "/user/$id" });
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; bio: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from("public_profiles" as any)
        .select("display_name, avatar_url, bio")
        .eq("public_id", id)
        .maybeSingle();
      if (!mounted) return;
      setProfile((data as any) ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

  const initials = useMemo(() => {
    const src = profile?.display_name || "";
    return src.split(/[\s@]+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }, [profile?.display_name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050509] text-white grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050509] text-white grid place-items-center">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight">User not found</h1>
          <p className="text-white/50 mt-2 text-sm">This profile may not exist or isn't public yet.</p>
          <Link to="/" className="mt-6 inline-block text-xs uppercase tracking-widest text-white/60 hover:text-white">Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-10">
        <Link to="/stream-studio" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60 hover:text-white mb-8">
          <ArrowLeft className="h-3 w-3" /> Back to Studio
        </Link>

        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative aspect-square w-40 overflow-hidden rounded-full border-2 border-white/10 bg-gradient-to-br from-fuchsia-600/30 to-blue-600/30">
            {profile.avatar_url ? (
              <SignedImg src={profile.avatar_url} alt={profile.display_name ?? "User"} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-4xl font-black text-white/30">{initials || "?"}</div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">{profile.display_name ?? "Unnamed"}</h1>
            {profile.bio && (
              <p className="mt-3 text-sm text-white/70 max-w-md mx-auto leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
