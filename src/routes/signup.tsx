import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — BWF Network" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<"artist" | "listener" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [stageName, setStageName] = useState("");
  const [genre, setGenre] = useState("");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    const redirectTo = role === "artist" ? "/artist/upgrade" : "/";
    const meta: Record<string, unknown> = {
      display_name: displayName,
      role,
    };
    if (role === "artist") {
      if (stageName) meta.stage_name = stageName;
      if (genre) meta.genre = genre;
    } else {
      if (interests) meta.interests = interests.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + redirectTo,
        data: meta,
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        toast.error("This email is already registered. Please sign in instead.");
        nav({ to: "/login" });
        return;
      }
      return toast.error(error.message);
    }
    toast.success("Check your email to confirm your account");
    nav({ to: "/login" });
  };

  const google = async () => {
    if (!role) return toast.error("Choose a role first");
    const redirectTo = role === "artist" ? "/artist/upgrade" : "/";
    // Persist chosen role for post-OAuth assignment fallback
    try { sessionStorage.setItem("pending_role", role); } catch {}
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + redirectTo });
    if (res.error) toast.error(res.error.message);
  };

  return (
    <div className="relative min-h-screen bg-black text-bone flex items-center justify-center p-6 overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        src={heroRapperVideo.url}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black" />
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(60% 50% at 50% 30%, rgba(225,29,42,0.35), transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-blood/30 bg-black/60 backdrop-blur-md p-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blood/90 px-3 py-1 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span className="font-cond tracking-[0.3em] text-[10px] uppercase text-white font-bold">
            BWF Network
          </span>
        </div>
        <h1 className="font-display text-4xl uppercase text-bone leading-[0.9]">
          Get On
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-blood)" }}
          >
            Stage.
          </span>
        </h1>
        <p className="mt-3 mb-6 text-sm text-bone/60">Join the BWF Network.</p>

        {step === "role" && (
          <>
            <p className="font-cond tracking-[0.3em] text-[10px] uppercase text-blood font-bold mb-3">I'm joining as a…</p>
            <div className="grid grid-cols-1 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setRole("artist")}
                className={`text-left rounded-xl border p-4 transition-colors ${role === "artist" ? "border-blood bg-blood/10" : "border-white/10 bg-black/40 hover:border-blood/40"}`}
              >
                <div className="font-display text-lg uppercase text-bone">🎤 Artist</div>
                <div className="text-xs text-bone/60 mt-1">I create content, music, or perform</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("listener")}
                className={`text-left rounded-xl border p-4 transition-colors ${role === "listener" ? "border-blood bg-blood/10" : "border-white/10 bg-black/40 hover:border-blood/40"}`}
              >
                <div className="font-display text-lg uppercase text-bone">🎧 Listener</div>
                <div className="text-xs text-bone/60 mt-1">I watch, listen, and engage</div>
              </button>
            </div>
            <button
              type="button"
              disabled={!role}
              onClick={() => setStep("details")}
              className="w-full rounded-md bg-blood text-white py-3 font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </>
        )}

        {step === "details" && (
          <>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="text-xs text-bone/60 hover:text-blood mb-3 transition-colors"
            >
              ← Change role ({role})
            </button>
            <button onClick={google} className="w-full mb-4 rounded-md bg-bone text-black py-2.5 font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white transition-colors">
              Continue with Google
            </button>
            <div className="flex items-center gap-2 my-4 text-[10px] text-bone/40"><div className="flex-1 h-px bg-white/10" />OR<div className="flex-1 h-px bg-white/10" /></div>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input required placeholder={role === "artist" ? "Display name" : "Username"} value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
              {role === "artist" && (
                <>
                  <input placeholder="Stage name (optional)" value={stageName} onChange={(e) => setStageName(e.target.value)}
                    className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
                  <input placeholder="Genre (optional)" value={genre} onChange={(e) => setGenre(e.target.value)}
                    className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
                </>
              )}
              {role === "listener" && (
                <input placeholder="Interests, comma separated (optional)" value={interests} onChange={(e) => setInterests(e.target.value)}
                  className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
              )}
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
              <input type="password" required minLength={6} placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
              <button disabled={loading} className="rounded-md bg-blood text-white py-3 font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors disabled:opacity-50">
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>
          </>
        )}

        <div className="mt-5 text-xs text-bone/60 text-center">
          Already have an account? <Link to="/login" className="text-blood hover:text-blood-glow transition-colors">Sign in</Link>
        </div>
      </div>
    </div>
  );
}