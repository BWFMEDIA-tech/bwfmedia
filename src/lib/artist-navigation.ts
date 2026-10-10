/** Navigation only: permissions remain enforced by each destination. */
export function artistDashboardDestination(roles: readonly string[]) {
  return roles.includes("artist") || roles.includes("admin")
    ? "/artist-dashboard"
    : "/signup";
}
/** Artist-only tools (Go Live, Distribution, Artist Dashboard). Listeners/members never qualify. */
export function hasArtistTools(roles: readonly string[]) {
  return roles.includes("artist") || roles.includes("admin");
}

/** Go Live also stays open to platform broadcasters (hosts/managers), matching the server check. */
export function canGoLive(roles: readonly string[]) {
  return hasArtistTools(roles) || roles.includes("host") || roles.includes("manager");
}
