import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import introAsset from "@/assets/videos/tunevio-logo-intro.mp4.asset.json";
import logoAsset from "@/assets/tunevio-icon.png.asset.json";
import { enableIntroAudio, playIntroWithFallback } from "@/lib/intro-audio";

/**
 * Site intro: plays the video with its uploaded soundtrack once per session,
 * attempting audible autoplay with no sound step.
 * A tap enables blocked mobile sound without restarting; Skip, video end, and a fail-safe
 * timer removes the splash if playback stalls.
 */
const SESSION_KEY = "tunevio:intro-played";

export function IntroSplash() {
  // Cover the first server-rendered frame, not only the hydrated page.
  const [show, setShow] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundRequested = useRef(false);
  const logoHoldRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setShow(false);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage unavailable (private mode) — still show the intro once.
    } finally {
      setSessionChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!show || !sessionChecked) return;
    const video = videoRef.current;
    if (!video) return;
    // Hold the static logo first so it reads as a deliberate beat, then
    // start the video. Try with sound first; if the browser blocks
    // unmuted autoplay, keep playing muted instead of trapping the user.
    const startVideo = () => {
      if (soundRequested.current) return;
      void playIntroWithFallback(video, () => !soundRequested.current).then((started) => {
        if (!started) setShow(false);
      });
    };
    logoHoldRef.current = window.setTimeout(startVideo, 1400);
    // Fail-safe: never leave the splash up longer than the clip can be.
    const failSafe = window.setTimeout(() => setShow(false), 14000);
    return () => {
      window.clearTimeout(logoHoldRef.current);
      window.clearTimeout(failSafe);
    };
  }, [show, sessionChecked]);

  if (!show) return null;

  const dismiss = () => setShow(false);
  const unlockSound = () => {
    const video = videoRef.current;
    if (!video) return;
    soundRequested.current = true;
    window.clearTimeout(logoHoldRef.current);
    void enableIntroAudio(video).then((enabled) => {
      if (!enabled) soundRequested.current = false;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background"
      role="dialog"
      aria-label="Tunevio intro"
      onClick={unlockSound}
    >
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={logoAsset.url} alt="Tunevio" className="h-44 w-auto max-w-[70%] object-contain" fetchPriority="high" />
        </div>
      )}
      <video
        ref={videoRef}
        src={introAsset.url}
        className={`relative h-full w-full object-contain ${playing ? "opacity-100" : "opacity-0"}`}
        preload="auto"
        playsInline
        onPlaying={() => setPlaying(true)}
        onEnded={dismiss}
        onError={dismiss}
      />
      <Button
        type="button"
        onClick={(event) => { event.stopPropagation(); dismiss(); }}
        aria-label="Skip intro"
        variant="outline"
        size="sm"
        className="absolute right-4 top-4 z-10 border-foreground/20 bg-background/60 text-foreground backdrop-blur-sm"
      >
        Skip
      </Button>
    </div>
  );
}
