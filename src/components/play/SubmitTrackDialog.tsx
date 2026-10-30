import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, X, CheckCircle2, Image as ImageIcon, Music2 } from "lucide-react";
import { toast } from "sonner";
import { submitPlayTrack, getSubmissionProfileTracks } from "@/lib/play.functions";
import { SignedImg } from "@/components/ui/signed-img";
import { Button } from "@/components/ui/button";

export function SubmitTrackDialog({ streamId, boostCredits, onClose, onSubmitted }: {
  streamId: string;
  defaultArtistName: string;
  boostCredits: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const submitFn = useServerFn(submitPlayTrack);
  const loadFn = useServerFn(getSubmissionProfileTracks);
  const [profileTracks, setProfileTracks] = useState<Array<{ id: string; title: string; cover_url: string | null }>>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [pickedProfileId, setPickedProfileId] = useState("");
  const [useBoost, setUseBoost] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadFn().then((tracks) => {
      if (!cancelled) setProfileTracks(tracks);
    }).catch(() => {
      if (!cancelled) setProfileError("Unable to load your profile songs. Close and try again.");
    }).finally(() => {
      if (!cancelled) setLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [loadFn]);

  const submit = async () => {
    if (submitting.current || !profileTracks.some((t) => t.id === pickedProfileId)) return;
    submitting.current = true;
    setBusy(true);
    try {
      const res = await submitFn({ data: { streamId, profileTrackId: pickedProfileId, useBoost } });
      toast.success(res.routedToBattle ? `Routed to Side ${String(res.battleSide).toUpperCase()} of the live battle` : "Track submitted to the queue");
      onSubmitted();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg border border-border bg-card p-6">
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="absolute right-3 top-3">
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold mb-4">Submit a track</h2>
        <div className="space-y-3">
          {loadingProfile && profileTracks.length === 0 && (
            <div className="text-xs text-muted-foreground">Loading your profile tracks…</div>
          )}
          {!loadingProfile && !profileError && profileTracks.length === 0 && (
            <div className="rounded-lg border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
              No songs on your profile yet. Upload music to your artist profile first, then come back to submit.
            </div>
          )}
          {profileError && <div role="alert" className="text-sm text-destructive">{profileError}</div>}
          {profileTracks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Music2 className="h-3.5 w-3.5" /> Choose a song from your profile
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {profileTracks.map((t) => (
                  <Button key={t.id} type="button" variant="outline" aria-pressed={pickedProfileId === t.id} disabled={busy} onClick={() => setPickedProfileId(t.id)}
                    className={`flex h-auto w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                      pickedProfileId === t.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"
                    }`}>
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
                      {t.cover_url ? <SignedImg src={t.cover_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    {pickedProfileId === t.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {boostCredits > 0 && (
            <label className="flex items-center gap-2 rounded-lg border border-border bg-muted p-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={useBoost} onChange={(e) => setUseBoost(e.target.checked)} />
              <Crown className="h-4 w-4 text-primary" />
              Use 1 boost credit ({boostCredits} left) — jump the line
            </label>
          )}
          <Button onClick={submit} disabled={busy || !pickedProfileId} className="w-full">
            {busy ? "Submitting…" : "Submit to live queue"}
          </Button>
        </div>
      </div>
    </div>
  );
}