// iOS software-keyboard detection for fixed overlays (e.g. the mobile messages pop-up).
// The layout viewport (window.innerHeight) stays put when the iOS keyboard opens while
// the visual viewport shrinks, so a large gap between the two means the keyboard is up.
// Browser chrome show/hide only moves the viewport by ~50-90px, well under this threshold.
export const IOS_KEYBOARD_MIN_HEIGHT = 150;

export function isSoftwareKeyboardOpen(
  layoutViewportHeight: number,
  visibleViewportHeight: number,
): boolean {
  return layoutViewportHeight - visibleViewportHeight > IOS_KEYBOARD_MIN_HEIGHT;
}
