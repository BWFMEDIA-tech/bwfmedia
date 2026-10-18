- Use opt-in profile layouts for shared LiveStage and LiveChat tools, because reference-matched profile presentation must not alter Arena or Studio layouts.
- Use the shared profile stage and chat presentation on `/go-live`, because starting a profile broadcast must show the same updated design as watching it without adding a second room connection.
- Order the profile roster explicitly below media controls and reuse shared hand-request controls for viewers and owners, because profile pages use CSS ordering and must share the existing approval workflow.
- Keep profile video sizing and control styling scoped to the profile selectors, because phone layouts must stack without changing shared broadcast tools or participant assignments.
- Keep Stream Studio on its own stage forks (src/components/studio/StudioStageRoom.tsx, StudioLiveStage.tsx) and profile lives on the stream/ copies, because the user wants Studio and profile stages to evolve separately; apply roster/permission changes to both copies when behavior (not styling) must stay aligned.
- Derive profile video-box visibility from host spotlight selections, because unselected artist and guest boxes must stay hidden on every device.

- Resolve stable stream-thumbnail identifiers using signed URLs after verifying a live stream references the exact image; draft previews use the owner-authenticated video signer, because the videos bucket is private.
