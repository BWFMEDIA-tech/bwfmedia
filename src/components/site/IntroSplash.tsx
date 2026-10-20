import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import introAsset from "@/assets/tunevio-intro-soundtrack.mp4.asset.json";

/**
 * Site intro: plays the video with its uploaded soundtrack once per session,
 * attempting audible autoplay with no sound step.
 * Never traps the user: tap to skip, video end dismisses, and a fail-safe
 * timer removes the splash if playback stalls.
 */
const SESSION_KEY = "tunevio:intro-played";

export function IntroSplash() {
  const [show, setShow] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage unavailable (private mode) — still show the intro once.
    }
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const video = videoRef.current;
    if (!video) return;
    // Try with sound first; if the browser blocks unmuted autoplay, keep
    // playing muted instead of trapping the user.
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {
        // Autoplay fully blocked — dismiss so the site is never blocked.
        setShow(false);
      });
    });
    // Fail-safe: never leave the splash up longer than the clip can be.
    const failSafe = window.setTimeout(() => setShow(false), 12000);
    return () => window.clearTimeout(failSafe);
  }, [show]);

  if (!show) return null;

  const dismiss = () => setShow(false);

  return (
    <div
      className="fixed inset-0 z-[100] bg-background"
      role="dialog"
      aria-label="Tunevio intro"
    >
      <video
        ref={videoRef}
        src={introAsset.url}
        className="h-full w-full object-cover md:object-contain"
        playsInline
        onEnded={dismiss}
        onError={dismiss}
      />
      <Button
        type="button"
        onClick={dismiss}
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
