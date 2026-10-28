// The account overview page itself lists every settings section, so this shell
// no longer renders a separate sidebar menu — it is a pass-through layout that
// keeps the shared Outlet wrapper for /settings routes.
export function GeneralSettingsShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
