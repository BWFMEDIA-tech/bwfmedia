import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Local track control only; never grants stage access or changes host moderation. */
export function SelfMicrophoneButton() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState(false);
  const allowed = localParticipant.permissions?.canPublish === true;
  if (!allowed) return null;
  const label = isMicrophoneEnabled ? "Mute my microphone" : "Unmute my microphone";
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your microphone. Check microphone permissions.");
    } finally { setBusy(false); }
  };
  return <Button variant="outline" className="min-h-11 gap-2" disabled={busy} aria-label={label} title={label} aria-pressed={!isMicrophoneEnabled} onClick={() => void toggle()}>
    {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-primary" />}
    {isMicrophoneEnabled ? "Mute" : "Unmute"}
  </Button>;
}