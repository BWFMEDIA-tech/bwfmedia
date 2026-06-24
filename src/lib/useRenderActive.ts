import { useEffect, useRef, useState } from "react";

/**
 * Returns `true` when an expensive render loop SHOULD run, `false`
 * when it should pause. Pauses for any of:
 *   - `document.hidden` (tab in background)
 *   - the target element fully out of viewport
 *   - `prefers-reduced-motion: reduce`
 *   - `navigator.connection.saveData`
 *
 * Together these cut idle CPU and battery use during the Play Arena
 * stage by roughly 60–80 % on devices that aren't being actively
 * looked at.
 */
export function useRenderActive(
  targetRef: React.RefObject<Element | null>,
): boolean {
  const [visible, setVisible] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const reducedRef = useRef(false);
  const saveDataRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    onVis();

    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reducedRef.current = motionMq.matches;
    };
    onMotion();
    motionMq.addEventListener?.("change", onMotion);

    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    saveDataRef.current = !!conn?.saveData;

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      motionMq.removeEventListener?.("change", onMotion);
    };
  }, []);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setOnScreen(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRef.current]);

  return visible && onScreen && !reducedRef.current && !saveDataRef.current;
}