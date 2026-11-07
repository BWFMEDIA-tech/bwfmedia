import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { activateMyArtistProfile } from "@/lib/artist-activation.functions";

export function ActivateArtistButton({ children = "Become an artist", className }: { children?: React.ReactNode; className?: string }) {
  const activate = useServerFn(activateMyArtistProfile);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await activate();
      window.dispatchEvent(new Event("tunevio:profile-updated"));
      await navigate({ to: "/artist/$id", params: { id: result.profileId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't activate your profile");
    } finally { setBusy(false); }
  }
  return <Button variant="outline" size="sm" className={className} disabled={busy} onClick={run}>
    {busy && <Loader2 className="h-4 w-4 animate-spin" />}{children}
  </Button>;
}