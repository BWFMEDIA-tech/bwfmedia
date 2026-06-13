import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, KeyRound, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/security")({ component: SecurityPage });

function SecurityPage() {
  const { user } = useAuth();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false);

  async function changePassword() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated"); setPw(""); setPw2("");
  }
  async function signOutAll() {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setBusy(false);
    if (error) return toast.error(error.message);
    window.location.href = "/login";
  }

  return (
    <SettingsShell title="Security" blurb="Manage your password and active sessions.">
      <Card title="Account"><div className="text-xs text-white/60">Signed in as <span className="text-white">{user?.email}</span></div></Card>
      <Card title="Change Password" icon={<KeyRound className="h-4 w-4 text-red-500" />}>
        <div className="grid gap-3 max-w-md">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8)" className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm" className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          <button onClick={changePassword} disabled={busy} className="inline-flex w-fit items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Update password</button>
        </div>
      </Card>
      <Card title="Active Sessions">
        <p className="mb-3 text-xs text-white/60">Sign out of every device including this one.</p>
        <button onClick={signOutAll} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-red-600/40 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-600/10"><LogOut className="h-4 w-4" />Sign out everywhere</button>
      </Card>
    </SettingsShell>
  );
}