import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — BWF Network" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) return toast.error(error.message);
    setSent(true);
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
          Reset
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-blood)" }}
          >
            Password.
          </span>
        </h1>
        <p className="mt-3 mb-6 text-sm text-bone/60">We'll email you a secure reset link.</p>

        {sent ? (
          <div className="rounded-md border border-blood/40 bg-blood/10 p-4 text-center">
            <p className="text-sm text-bone">Check your inbox.</p>
            <p className="mt-1 text-xs text-bone/60">If an account exists for that email, a reset link is on the way.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:border-blood/60 focus:outline-none transition-colors"
            />
            <button className="rounded-md bg-blood text-white py-3 font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors">
              Send reset link
            </button>
          </form>
        )}

        <div className="mt-5 text-xs text-bone/60 text-center">
          <Link to="/login" className="text-blood hover:text-blood-glow transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}