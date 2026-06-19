# Live Studio: Unified Media Engine

Refactor the current mode-switched studio into a single-page Live Production Dashboard with one persistent Media Engine. Stage and Broadcast become independent toggle layers feeding a shared audio mixer + encoder, never separate apps.

## Architecture

```text
INPUTS                    ROUTING                OUTPUTS
─────────────────        ─────────────         ──────────────────
Mic (getUserMedia)  ┐                      ┌─ Local monitor
Guest mics (WebRTC) ├──► AudioMixer ──────►├─ Stage publish (LiveKit audio)
Audience mics       │   (GainNodes,        │
Media/music         ┘    AudioContext)     │
                                           │
Camera ─────────────┐                      │
Screen share        ├──► Encoder ─────────►├─ Broadcast publish (LiveKit video
Video media         ┘   (video track +     │   + mixed audio track)
                        mixed audio)       └─ RTMP/SRT egress
```

Single `MediaEngine` singleton (React context) owns:
- One persistent `AudioContext` + master `GainNode`
- Per-source `MediaStreamAudioSourceNode` + `GainNode` (mic, each participant, each media element)
- One `MediaStreamAudioDestinationNode` producing the program-mix track
- Camera/screen `MediaStream`s held independently
- One LiveKit `Room` connection, joined once per session

Toggles mutate `enabled`/`gain.value`/`track.enabled` and call `room.localParticipant.setMicrophoneEnabled/setCameraEnabled/publishTrack/unpublishTrack`. Never `disconnect()` the room, never re-call `getUserMedia`, never rebuild the `AudioContext` on a toggle.

## Files

New:
- `src/lib/media-engine/MediaEngine.ts` — class wrapping AudioContext, source registry, mixer graph, camera/screen acquisition, LiveKit publish helpers. Idempotent `acquireMic()`, `acquireCamera()`, `acquireScreen()` cache the stream; `release*` stops the track. `setStageEnabled(bool)` / `setBroadcastEnabled(bool)` only flip publish state.
- `src/lib/media-engine/MediaEngineContext.tsx` — React provider that constructs one engine per room, exposes `useMediaEngine()` with reactive state (levels, source list, toggle states, stream stats).
- `src/components/studio/LiveProductionDashboard.tsx` — the new single-page layout matching the reference: header (Stage/Broadcast toggles + quick controls), Stage(Audio) panel, Broadcast(Video) panel, System Status sidebar. Mobile-first responsive (stacks Stage above Broadcast under `md`).
- `src/components/studio/StagePanel.tsx` — mic meter, participants list with per-row On/Off, Invite button. Reads from engine, never owns media.
- `src/components/studio/BroadcastPanel.tsx` — program preview `<video>` bound to the camera/screen MediaStream, Stream Output info (platform, key, status, bitrate, resolution, fps), Stop/Start Stream button.
- `src/components/studio/QuickControls.tsx` — Mute All, Camera, End Broadcast.
- `src/components/studio/SystemStatusCard.tsx` — Stage/Broadcast/Mixer/Stream status dots derived from engine state.

Changed:
- `src/routes/stream-studio.tsx` — replace mode-switched render with `<MediaEngineProvider><LiveProductionDashboard/></MediaEngineProvider>`. Keep auth + stream lookup. Mount existing `PlayArenaView`, `StageRoom`, `LiveChat` below the dashboard so PlayArena functionality stays intact.
- `src/components/stream/ModeToggle.tsx` — delete or repurpose as the two independent Stage/Broadcast toggle pills used in the header. Toggles do not unmount anything.
- `src/lib/stage-connection-context.tsx` — keep, but the engine becomes the single owner of `LocalParticipant` audio/video publish state; existing context calls route through the engine instead of issuing its own `setMicrophoneEnabled`.

Untouched: voting flow, PlayArena, StageRoom permissions, all server functions, DB.

## Toggle semantics (must hold)

| Action | Effect | What is NEVER done |
|---|---|---|
| Stage OFF | unpublish local mic track, mute participant subscribers' gain to 0 | room disconnect, AudioContext close, getUserMedia stop |
| Stage ON | re-publish cached mic track, restore gains | new getUserMedia, new AudioContext |
| Broadcast OFF | unpublish camera + stop RTMP egress | stop camera track, tear down encoder graph |
| Broadcast ON | publish cached camera track + start egress | new getUserMedia for camera, rebuild mix |
| Mute All | set master output gain to 0 | unpublish anything |
| Camera button | `videoTrack.enabled = !enabled` | acquire/release device |

All four state combinations (Stage on/off × Broadcast on/off) supported with zero media reinit.

## Out of scope this pass

- Real RTMP/SRT egress wiring (LiveKit Egress API call stub is fine; UI shows status from existing recording function).
- Audio-mixer DSP beyond gain + browser-native echo/noise suppression flags.
- Multi-camera switching UI.

## Verification

After implementing, drive Playwright against `/stream-studio` while signed in: toggle Stage off→on→off and Broadcast off→on→off in sequence, assert in console that `AudioContext` instance id and `getUserMedia` call count never increase after the first acquisition.
