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
    nav({ to: "/stream-studio" });
  };
  return (
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6 flex flex-col gap-3">
        <h1 className="text-2xl font-bold mb-1">Set new password</h1>
        <p className="text-xs text-white/60 -mt-1 mb-1">
          Use at least 8 characters. Avoid common or breached passwords.
        </p>
        <input type="password" required minLength={8} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <button disabled={loading} className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}