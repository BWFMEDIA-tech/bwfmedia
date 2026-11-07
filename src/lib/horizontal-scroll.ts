/** Mouse-only enhancement; touch and trackpad scrolling stay browser-native. */
export function installHorizontalCardDragging() {
  let cleanupDrag: (() => void) | undefined;
  let frame = 0;
  let suppressClickUntil = 0;

  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !(event.target instanceof Element)) return;
    if (event.target.closest('input, textarea, select, [role="slider"], [contenteditable="true"], [data-no-scroll-drag]')) return;
    let rail: HTMLElement | null = event.target.closest<HTMLElement>('[class*="overflow-x-auto"], [class*="overflow-x-scroll"], .tv-scroll');
    while (rail) {
      const style = getComputedStyle(rail);
      if ((style.display === "flex" || style.display === "grid") && /auto|scroll/.test(style.overflowX) && rail.scrollWidth > rail.clientWidth + 1 && !rail.querySelector("table")) break;
      rail = rail.parentElement?.closest<HTMLElement>('[class*="overflow-x-auto"], [class*="overflow-x-scroll"], .tv-scroll') ?? null;
    }
    if (!rail) return;
    const el = rail;
    cleanupDrag?.();
    cancelAnimationFrame(frame);
    const startX = event.clientX;
    const startY = event.clientY;
    const startScroll = el.scrollLeft;
    let lastX = startX;
    let lastTime = performance.now();
    let velocity = 0;
    let dragging = false;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(e.clientY - startY) > Math.abs(dx) && Math.abs(e.clientY - startY) > 6) { finish(false); return; }
        if (Math.abs(dx) < 6) return;
        dragging = true;
        el.setAttribute("data-card-dragging", "");
      }
      e.preventDefault();
      const now = performance.now();
      velocity = (lastX - e.clientX) / Math.max(1, now - lastTime);
      el.scrollLeft = startScroll - dx;
      lastX = e.clientX;
      lastTime = now;
    };
    const finish = (inertia: boolean) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      cleanupDrag = undefined;
      if (!dragging) return;
      suppressClickUntil = performance.now() + 350;
      const stop = () => el.removeAttribute("data-card-dragging");
      if (!inertia || performance.now() - lastTime > 80 || matchMedia("(prefers-reduced-motion: reduce)").matches) { stop(); return; }
      velocity = Math.max(-2.5, Math.min(2.5, velocity));
      let previous = performance.now();
      const coast = (now: number) => {
        const dt = Math.min(32, now - previous);
        previous = now;
        const before = el.scrollLeft;
        el.scrollLeft += velocity * dt;
        velocity *= Math.exp(-dt / 180);
        if (!el.isConnected || Math.abs(velocity) < 0.03 || el.scrollLeft === before) { stop(); return; }
        frame = requestAnimationFrame(coast);
      };
      cleanupDrag = () => { cancelAnimationFrame(frame); stop(); };
      frame = requestAnimationFrame(coast);
    };
    const up = (e: PointerEvent) => { if (e.pointerId === event.pointerId) finish(true); };
    const cancel = () => finish(false);
    cleanupDrag = cancel;
    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
  };
  const onClick = (event: MouseEvent) => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  };
  const onNativeDrag = (event: DragEvent) => {
    if (event.target instanceof Element && event.target.closest('[class*="overflow-x-auto"], [class*="overflow-x-scroll"], .tv-scroll')) event.preventDefault();
  };
  document.addEventListener("pointerdown", onDown);
  document.addEventListener("click", onClick, true);
  document.addEventListener("dragstart", onNativeDrag);
  return () => {
    cleanupDrag?.();
    cancelAnimationFrame(frame);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("dragstart", onNativeDrag);
  };
}