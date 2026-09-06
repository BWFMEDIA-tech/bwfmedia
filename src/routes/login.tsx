import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — BWF Network" }] }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const raw =
      (typeof s.next === "string" && s.next) ||
      (typeof s.redirect === "string" && s.redirect) ||
      "";
    // Same-origin relative paths only — never an absolute/off-site URL.
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;
    return next ? { next } : {};
  },
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // If a session already exists (e.g. returning from Google OAuth), move on.
  // Do not call another auth method from onAuthStateChange: doing so can block
  // the auth client's internal session lock and leave the form stuck loading.
  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled || !data.session) return;
        const saved = sessionStorage.getItem("bwf:post-login");
        sessionStorage.removeItem("bwf:post-login");
        const destination = next ?? saved;
        if (destination) {
          window.location.assign(destination);
          return;
        }
        nav({ to: "/" });
      } catch {
        // Keep the sign-in form available when a stale browser session cannot
        // be restored; submitting the form will establish a fresh session.
      }
    };
    void go();
    return () => {
      cancelled = true;
    };
  }, [next, nav]);

  const onGoogle = async () => {
    setFailed(false);
    setGoogleLoading(true);
    try {
      if (next) sessionStorage.setItem("bwf:post-login", next);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/login",
      });
      if (result.error) {
        setGoogleLoading(false);
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      const saved = sessionStorage.getItem("bwf:post-login");
      sessionStorage.removeItem("bwf:post-login");
      if (saved) window.location.assign(saved);
      else nav({ to: "/" });
    } catch {
      setGoogleLoading(false);
      toast.error("Unable to connect to Google. Please try again.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setLoading(false);
        // Generic message — never reveal whether the email exists
        setFailed(true);
        return toast.error("Incorrect email or password.");
      }
      toast.success("Signed in");
      if (next) {
        window.location.assign(next);
        return;
      }
      const uid = data.user?.id;
      let dest: "/stream-studio" | "/" | "/artist-dashboard" = "/stream-studio";
      if (uid) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        const list = (roles ?? []).map((r: { role: string }) => r.role);
        // Admins must use the dedicated /admin/login surface so admin sessions
        // never leak into the member-facing app. Reject here and redirect.
        if (list.includes("admin")) {
          await supabase.auth.signOut();
          toast.error("Admin accounts must sign in at /admin/login.");
          setLoading(false);
          return nav({ to: "/admin/login" });
        }
        if (list.includes("listener") && !list.includes("artist")) dest = "/";
        // Artists do not get Stream Now / hosting tools — only hosts/managers
        // do. Send artist-only accounts to their dashboard, from which they
        // can join existing stages as guests.
        const isPrivileged = list.includes("manager") || list.includes("host");
        if (list.includes("artist") && !isPrivileged) dest = "/artist-dashboard";
      }
      nav({ to: dest });
    } catch {
      setLoading(false);
      setFailed(true);
      toast.error("Unable to reach sign-in. Please check your connection and try again.");
    }
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

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-cond text-[10px] uppercase tracking-[0.3em] text-bone/40">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 py-3 font-cond text-xs font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </button>

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