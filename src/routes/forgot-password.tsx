import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
        <h1 className="text-2xl font-bold mb-1">Reset password</h1>
        <p className="text-sm text-white/60 mb-6">We'll email you a reset link.</p>
        {sent ? (
          <p className="text-sm text-emerald-400">Check your inbox.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold">
              Send reset link
            </button>
          </form>
        )}
        <div className="mt-4 text-xs text-white/60 text-center">
          <Link to="/login" className="hover:text-white underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}