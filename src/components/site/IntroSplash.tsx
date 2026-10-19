import { useEffect, useRef, useState } from "react";
import introAsset from "@/assets/tunevio-intro.mp4.asset.json";

/**
 * Site intro: plays the brand video once per browser session before the site
 * is presented. Never traps the user — tap to skip, video end dismisses, and
 * a fail-safe timer removes the splash if playback stalls.
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
    // Try with sound first; browsers reject unmuted autoplay, so fall back.
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
      className="fixed inset-0 z-[100] bg-black"
      onClick={dismiss}
      role="presentation"
    >
      <video
        ref={videoRef}
        src={introAsset.url}
        className="h-full w-full object-cover md:object-contain"
        playsInline
        onEnded={dismiss}
      />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Skip intro"
        className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
      >
        Skip
      </button>
    </div>
  );
}
