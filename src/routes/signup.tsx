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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/stream-studio",
        data: { display_name: displayName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm");
    nav({ to: "/login" });
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/stream-studio" });
    if (res.error) toast.error(res.error.message);
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-sm text-white/60 mb-6">Join the BWF Network</p>
        <button onClick={google} className="w-full mb-4 rounded-lg bg-white text-black py-2.5 text-sm font-semibold hover:opacity-90">
          Continue with Google
        </button>
        <div className="flex items-center gap-2 my-4 text-[10px] text-white/40"><div className="flex-1 h-px bg-white/10" />OR<div className="flex-1 h-px bg-white/10" /></div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input required placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input type="password" required minLength={6} placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <button disabled={loading} className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className="mt-4 text-xs text-white/60 text-center">
          Already have an account? <Link to="/login" className="hover:text-white underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}