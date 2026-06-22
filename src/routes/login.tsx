import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — BWF Network" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Generic message — never reveal whether the email exists
      setFailed(true);
      return toast.error("Incorrect email or password.");
    }
    toast.success("Signed in");
    const uid = data.user?.id;
    let dest: "/stream-studio" | "/" = "/stream-studio";
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (roles ?? []).map((r: any) => r.role);
      // Admins must use the dedicated /admin/login surface so admin sessions
      // never leak into the member-facing app. Reject here and redirect.
      if (list.includes("admin")) {
        await supabase.auth.signOut();
        toast.error("Admin accounts must sign in at /admin/login.");
        return nav({ to: "/admin/login" });
      }
      if (list.includes("listener") && !list.includes("artist")) dest = "/";
      // Artists do not get Stream Now / hosting tools — only hosts/managers
      // do. Send artist-only accounts to their dashboard, from which they
      // can join existing stages as guests.
      const isPrivileged =
        list.includes("manager") || list.includes("host");
      if (list.includes("artist") && !isPrivileged) {
        // @ts-expect-error widen dest to the artist destination
        dest = "/artist-dashboard";
      }
    }
    nav({ to: dest });
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
          Sign
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-blood)" }}
          >
            In.
          </span>
        </h1>
        <p className="mt-3 mb-6 text-sm text-bone/60">Welcome back to the stage.</p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors" />
          <button disabled={loading} className="rounded-md bg-blood text-white py-3 font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {failed && (
          <div className="mt-4 rounded-md border border-blood/40 bg-blood/10 p-3 text-center">
            <p className="text-xs text-bone/80 mb-2">Incorrect email or password.</p>
            <Link to="/forgot-password" className="font-cond tracking-[0.2em] text-xs uppercase text-blood hover:text-blood-glow transition-colors">
              Forgot password?
            </Link>
          </div>
        )}
        <div className="flex justify-between mt-5 text-xs text-bone/60">
          <Link to="/forgot-password" className="hover:text-blood transition-colors">Forgot password?</Link>
          <Link to="/signup" className="hover:text-blood transition-colors">Create account</Link>
        </div>
      </div>
    </div>
  );
}