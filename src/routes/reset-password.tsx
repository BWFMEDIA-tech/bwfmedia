import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav({ to: "/stream-studio" });
  };
  return (
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6 flex flex-col gap-3">
        <h1 className="text-2xl font-bold mb-1">Set new password</h1>
        <input type="password" required minLength={6} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <button disabled={loading} className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}