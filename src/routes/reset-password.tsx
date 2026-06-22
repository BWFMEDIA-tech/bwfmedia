import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — BWF Network" }] }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("compromised")) {
        return toast.error(
          "This password has been found in a data breach. Please choose a stronger, unique password (try 12+ characters with mixed case, numbers, and symbols).",
          { duration: 8000 },
        );
      }
      if (msg.includes("same") || msg.includes("different from the old")) {
        return toast.error("New password must be different from your previous password.");
      }
      if (msg.includes("session") || msg.includes("expired") || msg.includes("invalid")) {
        return toast.error("Your reset link has expired. Request a new one from the forgot-password page.");
      }
      return toast.error(error.message);
    }
    toast.success("Password updated");
    // Send users to a destination that matches their role. Artists/listeners
    // must not land on /stream-studio — that surface is host/admin only.
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (roles ?? []).map((r: any) => r.role);
      const isPrivileged = list.includes("admin") || list.includes("manager") || list.includes("host");
      if (!isPrivileged && list.includes("artist")) return nav({ to: "/artist-dashboard" });
      if (!isPrivileged) return nav({ to: "/" });
    }
    nav({ to: "/stream-studio" });
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
          New
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-blood)" }}
          >
            Password.
          </span>
        </h1>
        <p className="mt-3 mb-6 text-sm text-bone/60">
          Use 8+ characters. Avoid common or breached passwords.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors"
          />
          <button
            disabled={loading}
            className="rounded-md bg-blood text-white py-3 font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="mt-5 text-xs text-bone/60 text-center">
          <Link to="/login" className="text-blood hover:text-blood-glow transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}