import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "./SettingsShell";
import { deleteMyAccount } from "@/lib/account-deletion.functions";
import { supabase } from "@/integrations/supabase/client";

export function DeleteAccountSection({ signedIn, appleConnected }: { signedIn: boolean; appleConnected: boolean }) {
  const removeAccount = useServerFn(deleteMyAccount);
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [appleDisconnectUrl, setAppleDisconnectUrl] = useState("");

  async function submit() {
    if (confirmation !== "DELETE" || busy) return;
    setBusy(true); setError("");
    try {
      const result = await removeAccount({ data: { confirmation: "DELETE" } });
      if ("error" in result) { setError(result.error); return; }
      if (appleConnected) {
        const url = new URL("/~oauth/apple/revoke", window.location.origin);
        url.searchParams.set("redirect_uri", window.location.origin);
        setAppleDisconnectUrl(url.toString());
      }
      setDeleted(true);
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      setError("Deletion could not finish. Please retry to confirm your account was removed.");
    } finally { setBusy(false); }
  }

  if (!signedIn && !deleted) return null;

  return (
    <Card title="Delete account" icon={<Trash2 className="h-4 w-4 text-muted-foreground" />}>
      {deleted ? <div role="status" className="space-y-3 pb-24 md:pb-0">
        <p className="text-sm">Your Tunevio account has been deleted.</p>
        <p className="text-sm text-muted-foreground">Required payment and earnings records are retained for seven years. Unpaid earnings remain protected.</p>
        {appleDisconnectUrl && <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Disconnect your Apple authorization to finish removing the connection.</p>
          <Button asChild variant="outline"><a href={appleDisconnectUrl} target="_blank" rel="noopener noreferrer">Disconnect Apple</a></Button>
        </div>}
        <Button asChild variant="outline"><a href="/home">Return to Tunevio</a></Button>
      </div> : <div className="max-w-lg space-y-4 pb-24 md:pb-0">
        <p className="text-sm text-muted-foreground">Permanently remove your account, profile, uploaded content, messages and settings. This cannot be undone.</p>
        <p className="text-sm text-muted-foreground">Active memberships will be canceled. Required payment and artist earnings records are retained for seven years, and unpaid earnings are not erased.</p>
        {!confirming ? <Button variant="destructive" onClick={() => setConfirming(true)}><Trash2 />Delete Account</Button> : <div className="space-y-3">
          <label htmlFor="delete-confirmation" className="block text-sm font-medium">Type DELETE to confirm</label>
          <input id="delete-confirmation" autoComplete="off" value={confirmation} disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={busy || confirmation !== "DELETE"} onClick={() => void submit()}>
              {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}{busy ? "Deleting…" : "Permanently delete account"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => { setConfirming(false); setConfirmation(""); setError(""); }}>Cancel</Button>
          </div>
        </div>}
      </div>}
    </Card>
  );
}