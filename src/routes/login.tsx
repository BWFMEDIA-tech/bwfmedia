import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BWF Media TV" },
      {
        name: "description",
        content:
          "Sign in or create your BWF Media account to book studio time, manage your orders, and access exclusive drops.",
      },
      { property: "og:title", content: "Sign in — BWF Media TV" },
      {
        property: "og:description",
        content: "Sign in or create your BWF Media account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/" },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account before signing in.");
        } else {
          navigate({ to: "/" });
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/",
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Futuristic red glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(255,45,45,0.18), transparent 60%), radial-gradient(40% 35% at 80% 90%, rgba(255,45,45,0.12), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "rgba(255,45,45,0.35)" }}
      />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-2xl p-8 space-y-5 backdrop-blur-xl"
        style={{
          background: "rgba(10,0,0,0.55)",
          border: "1px solid rgba(255,45,45,0.25)",
          boxShadow: "0 0 40px rgba(255,45,45,0.15), inset 0 0 20px rgba(255,45,45,0.05)",
        }}
      >
        <div className="text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white">
            BWF Media
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-white/60 mt-2">
            {mode === "signin"
              ? "Sign in to book sessions and manage orders."
              : "Join to book studio time and unlock drops."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
          onClick={onGoogle}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="px-3 text-white/40" style={{ background: "rgba(10,0,0,0.85)" }}>
              or
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black/40 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[rgba(255,45,45,0.5)]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black/40 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[rgba(255,45,45,0.5)]"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-400">{notice}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full text-white border-0"
          style={{
            background: "linear-gradient(135deg, #ff2d2d 0%, #b30000 100%)",
            boxShadow: "0 0 20px rgba(255,45,45,0.4)",
          }}
        >
          {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="text-xs text-white/60 hover:text-white w-full text-center"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
