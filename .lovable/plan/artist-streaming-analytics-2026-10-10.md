# Artist Streaming Analytics

## Build
- Fix the profile Follow action so its count uses the saved follow result and updates immediately after follow or unfollow.
- Add a dedicated artist analytics page inside the artist dashboard, following the supplied layout: summary cards, world/location panel, country and city tables, regional chart, stream timeline, and top tracks.
- Add Analytics navigation and an owner-facing link so artists can reach the page directly.

## Data and access
- Use only recorded Tunevio stream events and uploaded-track data; show clear empty states instead of sample numbers.
- Restrict detailed analytics to the signed-in artist's own catalog. Administrators may inspect an artist only through existing protected admin access where appropriate.
- Read optional location values from stream-event metadata when present; the dashboard remains useful when location data is not yet available.

## Mobile
- Stack summary cards, charts, map, and tables for phones while preserving the same information hierarchy.
- Keep tables horizontally scrollable where needed, without making the page itself scroll sideways.

## Verification
- Add focused tests for analytics aggregation and follower-count updates.
- Verify the follower action and analytics page while signed in, on desktop and phone widths.