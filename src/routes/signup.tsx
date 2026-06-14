import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-sm text-white/60 mb-6">Join the BWF Network</p>

        {step === "role" && (
          <>
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">I'm joining as a…</p>
            <div className="grid grid-cols-1 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setRole("artist")}
                className={`text-left rounded-xl border p-4 transition ${role === "artist" ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-black/30 hover:border-white/30"}`}
              >
                <div className="text-lg font-semibold">🎤 Artist</div>
                <div className="text-xs text-white/60">I create content, music, or perform</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("listener")}
                className={`text-left rounded-xl border p-4 transition ${role === "listener" ? "border-blue-400 bg-blue-500/10" : "border-white/10 bg-black/30 hover:border-white/30"}`}
              >
                <div className="text-lg font-semibold">🎧 Listener</div>
                <div className="text-xs text-white/60">I watch, listen, and engage</div>
              </button>
            </div>
            <button
              type="button"
              disabled={!role}
              onClick={() => setStep("details")}
              className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50"
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
              className="text-xs text-white/60 hover:text-white mb-3"
            >
              ← Change role ({role})
            </button>
            <button onClick={google} className="w-full mb-4 rounded-lg bg-white text-black py-2.5 text-sm font-semibold hover:opacity-90">
              Continue with Google
            </button>
            <div className="flex items-center gap-2 my-4 text-[10px] text-white/40"><div className="flex-1 h-px bg-white/10" />OR<div className="flex-1 h-px bg-white/10" /></div>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input required placeholder={role === "artist" ? "Display name" : "Username"} value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              {role === "artist" && (
                <>
                  <input placeholder="Stage name (optional)" value={stageName} onChange={(e) => setStageName(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                  <input placeholder="Genre (optional)" value={genre} onChange={(e) => setGenre(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                </>
              )}
              {role === "listener" && (
                <input placeholder="Interests, comma separated (optional)" value={interests} onChange={(e) => setInterests(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              )}
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <input type="password" required minLength={6} placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <button disabled={loading} className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>
          </>
        )}

        <div className="mt-4 text-xs text-white/60 text-center">
          Already have an account? <Link to="/login" className="hover:text-white underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}