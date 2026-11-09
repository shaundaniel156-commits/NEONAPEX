# THE LAST PROMISE

A fully coded, real-time 3D animated short film (5 minutes, six scenes) built with
**TypeScript + Three.js + Vite**. There are no video clips, no images, no AI-generated
assets and no downloaded models: every character, set, prop, texture, movement, facial
expression, camera move, sound effect and musical note is produced by code at runtime.

> Kampala, Uganda. Daniel (17), a self-taught coder, promises his mother Grace (42), a
> market vendor, that he will never give up. His best friend Brian (18) brings him a
> chance at a scholarship. Grace sacrifices her stock money for the entry fee. The night
> before the deadline the old laptop dies with three months of work on it...

| # | Scene | Length | Set |
|---|-------|-------:|-----|
| 1 | A Promise | 45 s | Daniel's home, morning |
| 2 | The Opportunity | 50 s | Kabalagala Road, afternoon |
| 3 | The Sacrifice | 50 s | Nakasero market, late afternoon |
| 4 | The Unexpected Problem | 65 s | Daniel's bedroom, night, rain |
| 5 | The Final Attempt | 65 s | Bedroom, night into dawn |
| 6 | The Real Victory | 25 s | Home, evening, one week later |

## Running it

Requires Node 18+ and a modern desktop browser (Chrome, Edge, Firefox, Safari).

```bash
npm install
npm run dev
```

Open the printed URL (normally http://localhost:5173), click **Watch the film**.
The click is needed so the browser allows audio.

Production build and preview:

```bash
npm run build
npm run preview
```

### Player controls

Play/pause, restart, timeline scrubber, timestamp / total duration, scene buttons 1-6,
playback speed (0.5x - 2x), volume, subtitle toggle, fullscreen.
Keyboard: `Space` play/pause, `←`/`→` seek 2 s (`Shift` = 10 s), `1`-`6` jump to scene, `F` fullscreen.
The controls auto-hide while playing; move the mouse to bring them back.

### URL parameters (development)

| Parameter | Effect |
|-----------|--------|
| `?scene=3` | start at scene 3 |
| `?t=120` | start at 120 s |
| `?test=1` | the 20-second Daniel & Grace test scene (the character/animation milestone) |
| `?lineup=1` | character line-up: expressions, hands, gestures |
| `?env=street` | slow tour of a set (`home`, `street`, `market`, `bedroom`) |
| `?lowfx=1` | disable depth of field (faster) |
| `?nobloom=1` | disable bloom |
| `?ssao=1` | enable screen-space ambient occlusion (costly) |
| `?autoplay=1` | skip the start screen (audio stays off until a click) |
| `?paused=1` | load paused |

Headless verification tools (used during development; need Playwright + Chromium):

```bash
node scripts/screenshots.mjs "scene=2" 48 54 60     # film-time seconds -> screenshots/
node scripts/smoke.mjs 0.5                           # steps through all 300 s, reports errors
```

## How it is built

Everything is evaluated from one deterministic film clock, so pause / resume / seek /
scene jumps / speed changes are always exact. Nothing runs on its own timer.

```
src/
  characters/   CharacterBuilder.ts  procedural humanoid: displaced-sphere skull with eye sockets,
                                     cheeks, brow ridge and jaw; eyeballs with iris/pupil caps and
                                     rotating eyelids; live-deformed lip tubes; nose, ears, hair;
                                     ring-tube torso/skirt, lathe limbs, palms + 3-segment fingers
                CharacterRig.ts      joint hierarchy (hips, spine, chest, neck, head, shoulders, arms,
                                     elbows, wrists, fingers, hips, knees, ankles) and pose blending
                FacialAnimation.ts   expression presets, deterministic blinking, text -> viseme lip-sync
                Daniel.ts Grace.ts Brian.ts   the three leads (parameters only - same builder)
  animations/   Idle.ts Walking.ts Talking.ts Gestures.ts EmotionalActions.ts
                walk/run cycles driven by distance, sitting, typing, pointing, holding, waving,
                hugging, celebrating, crying, slumping, surprise, wiping tears ...
  environments/ Home.ts KampalaStreet.ts Market.ts Bedroom.ts  (+ Crowd.ts background people)
  effects/      Weather.ts   GPU rain streaks, window droplets, dust motes, drifting clouds
  core/         Renderer.ts  PBR + shadows, bokeh depth of field, bloom, colour grade, grain, vignette
                Textures.ts  all textures painted on <canvas> (wood, wax print, road, signs, screens...)
  camera/       CinematicCamera.ts  shots: static, dolly, pan/tilt, tracking, OTS, handheld, DOF focus
  timeline/     AnimationTimeline.ts deterministic clock, scenes, events, play/pause/seek/speed
  scenes/       Direction.ts  scene-scripting DSL (place / walk / sit / pose / expr / look / say /
                              hold / shot / sfx / music / grade)   Scene1..6.ts  the film
  story/        Screenplay.ts  every line of dialogue in one editable place
  dialogue/     DialogueManager.ts  per-character voice tracks; imported audio or Web Speech fallback
  subtitles/    SubtitleManager.ts  synchronised, speaker-identified captions
  audio/        AudioManager.ts     Web Audio buses, synthesised SFX, generated ambience, procedural music
  components/   AnimationPlayer.ts Controls.ts  the player shell and UI
```

### Editing the film

* **Dialogue**: edit `src/story/Screenplay.ts`. Subtitles and lip-sync follow the text automatically.
* **Blocking, acting, camera**: each `src/scenes/SceneN.ts` is a readable script, e.g.
  `b.walk('grace', [kitchen, besideDaniel], 14, 17.6)`, `b.say(L[3], 18.0, { expr: 'smile' })`,
  `b.shot(22, 27, { pos: offset(D, 0.75, 0, 0.7), look: D, fov: 27 })`. Times are seconds from the
  start of the scene.
* **Characters**: change colours, clothing, face parameters in `Daniel.ts` / `Grace.ts` / `Brian.ts`;
  the builder in `CharacterBuilder.ts` is shared.
* **New poses**: add a function returning a partial `Pose` in `src/animations/`.

### Audio

All sound is generated (noise networks for rain / street / market / room tone, a small
procedural sequencer for the score, synthesised footsteps, keys, thunder, phone buzz ...).
Dialogue uses the browser's Web Speech API as a fallback voice. To use real recordings or
legally obtained music, drop files into `public/audio/{dialogue,music,effects}` and list them
in `public/audio/manifest.json` (dialogue keys are line ids such as `s3_05` = scene 3, line 5).
Listed files replace the generated versions; nothing else changes.

## Performance notes

Targets 24 fps or better on an ordinary laptop with an integrated GPU: shared materials,
instanced produce, low-detail background people, one shadow-casting sun with controlled
map size, GPU-computed rain. If a machine struggles, append `?lowfx=1`.
