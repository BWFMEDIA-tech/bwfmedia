import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — BWF Network" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    const uid = data.user?.id;
    let dest: "/stream-studio" | "/" = "/stream-studio";
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (roles ?? []).map((r: any) => r.role);
      if (list.includes("listener") && !list.includes("artist")) dest = "/";
    }
    nav({ to: dest });
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/stream-studio" });
    if (res.error) toast.error(res.error.message);
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
        <h1 className="text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-sm text-white/60 mb-6">Welcome back to BWF Network</p>
        <button onClick={google} className="w-full mb-4 rounded-lg bg-white text-black py-2.5 text-sm font-semibold hover:opacity-90">
          Continue with Google
        </button>
        <div className="flex items-center gap-2 my-4 text-[10px] text-white/40"><div className="flex-1 h-px bg-white/10" />OR<div className="flex-1 h-px bg-white/10" /></div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <button disabled={loading} className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="flex justify-between mt-4 text-xs text-white/60">
          <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
          <Link to="/signup" className="hover:text-white">Create account</Link>
        </div>
      </div>
    </div>
  );
}