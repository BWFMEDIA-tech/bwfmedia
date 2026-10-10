/** Navigation only: permissions remain enforced by each destination. */
export function artistDashboardDestination(roles: readonly string[]) {
  return roles.includes("artist") || roles.includes("admin")
    ? "/artist-dashboard"
    : "/signup";
}