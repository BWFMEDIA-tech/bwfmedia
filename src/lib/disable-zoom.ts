/** Blocks pinch, double-tap and ctrl/trackpad zoom while leaving single-finger scrolling and swipes native. */
export function installZoomBlocker(): () => void {
  if (typeof window === "undefined") return () => {};
  const opts: AddEventListenerOptions = { passive: false };
  const prevent = (e: Event) => e.preventDefault();
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) e.preventDefault();
  };
  let lastTouchEnd = 0;
  const onTouchEnd = (e: TouchEvent) => {
    const now = Date.now();
    const target = e.target as HTMLElement | null;
    const editable = target?.closest?.("input, textarea, select, [contenteditable='true']");
    if (!editable && now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
  };
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) e.preventDefault();
  };
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
  };
  document.addEventListener("gesturestart", prevent, opts);
  document.addEventListener("gesturechange", prevent, opts);
  document.addEventListener("touchmove", onTouchMove, opts);
  document.addEventListener("touchend", onTouchEnd, opts);
  window.addEventListener("wheel", onWheel, opts);
  window.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("gesturestart", prevent);
    document.removeEventListener("gesturechange", prevent);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
  };
}
