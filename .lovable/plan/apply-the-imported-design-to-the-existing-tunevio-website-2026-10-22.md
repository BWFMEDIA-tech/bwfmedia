# Apply the imported design to the existing Tunevio website

## Current limitation
The four Figma pages are not visible in the accessible project files or uploads, and no desktop Figma tools are available in this conversation. Their names, layouts, exact fonts, colors, spacing, component variants and assets cannot yet be verified. This is a proposed integration approach—not a completed Figma comparison.

**Before implementation:** make those four pages accessible through the Figma Desktop connection or attach their exported images and page names. Complete the page-by-page comparison and obtain approval of the specific changes before editing website code.

## Proposed changes to the existing website
| Existing area | Presentation changes to consider once designs are accessible | Keep unchanged |
|---|---|---|
| Home and discovery screens | Match section arrangement, artwork proportions, headings and card spacing where shown in Figma | Real catalog content, latest-artist selection, search and playback |
| Shared menus and navigation | Match visual alignment, icons, selected states and phone layout | Existing destinations, role-aware entries, Inbox, Go Live and Store access |
| Artist and music cards | Match portrait/artwork framing, borders, typography and action placement | Follow/Following persistence, status beacons, profile links and playback |
| Music player and video screens | Match control appearance, artwork framing and layout only where covered by the imported pages | Persistent player state, queues, signed media, saves and independent live/Arena controls |
| Artist profiles and dashboards | Match page organization, information hierarchy and visual treatment where covered | Account ownership, uploads, analytics, messaging and earnings data |
| Forms, tabs and dialogs | Match labels, fields, buttons, spacing and error-state appearance | Validation, permissions, submissions and existing actions |
| Store and account screens | Restyle only if one of the four designs covers them | Product data, stock, prices, checkout, authentication and integrations |

These are candidate surfaces, not claims about what the four Figma pages contain. Only areas actually represented by the imported design and explicitly approved will change.

## Comparison deliverable before edits
For each accessible Figma page, provide:
- Its page/frame name and the corresponding existing Tunevio page.
- Available UI components, button states and navigation patterns.
- Verified colors, fonts, spacing and image/icon assets; label estimates when only screenshots are available.
- Differences from the existing website and a concrete list of appearance-only updates.
- Existing functionality that must remain, including controls absent from the design.

## Preservation rules
- Update this website in place; no separate website, replacement project or route duplication.
- Preserve database, authentication, payments, integrations, routes, content and working features.
- Keep the supplied Tunevio logo and established cyan/electric-blue/silver/black branding; flag any conflicting Figma colors for a decision rather than silently introducing pink.
- Keep existing actions and states even when the design omits them; adapt their appearance instead of removing them.
- No schema changes, financial changes, publication or royalty implementation as part of this visual review.

## Implementation after the specific comparison is approved
- Reuse existing page and shared UI components; apply approved visual tokens through the current design system.
- Preserve page-specific control styling so music, profile-live and Stream Studio controls do not affect each other.
- Verify phone/desktop layouts and exercise affected navigation, follow, playback, forms and signed-in views.
- Report what was changed and what was tested. Obtain a separate request before publishing.