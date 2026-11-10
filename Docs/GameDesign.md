# NEON APEX — Game Design (Phase 1, approved)

Approved by the owner on 2026-11-10. Any line can be changed later at the owner's request.

## Concept

NEON APEX is a racing game. The player drives a fast car through a city at night, lit by neon, and tries to finish first or set the best time.

## Approved decisions

| Topic | Decision |
|---|---|
| Game structure | Track-based racing in one city district, built so it can grow into an open world later |
| Look | Realistic-looking cars and city, at night, with neon lighting |
| Handling | Arcade: responsive and forgiving, not simulation |
| Camera | First-person cockpit first. A chase camera is added later as a second view |
| Platforms | Windows first. Android later. Input is built so touch can be added without a rewrite |
| Process | One phase at a time with owner approval. A developer agent and a tester agent work inside each phase |
| Backend and database | None for now. Considered only if online features are approved |
| Engine | Unity 6 with URP and C# (exact version fixed in Phase 2) |
| Left out for now | Weather, damage, customization, currency, multiplayer, online services |

## Core loop

Choose race → countdown → drive → pass checkpoints → complete laps → finish → results → retry.

## Race structure

1. Car on the start grid, controls locked.
2. Countdown: 3, 2, 1, GO.
3. Laps around a closed circuit. Checkpoints must be passed in order.
4. A small number of AI opponents.
5. Finish after the final lap.
6. Results: position, total time, best lap. Restart or quit.

Lap count and AI opponent count are tuning values, with 3 laps and 3 opponents as the starting point.

## Vehicle

- One playable car for the MVP.
- Throttle W / Up, brake and reverse S / Down, steer A / D or Left / Right, reset R.
- Handbrake and sliding are decided during physics tuning (Phase 5).
- All tuning values are editable in the Inspector.

## Cockpit

Steering wheel, dashboard with speed and RPM gauges, rear-view mirror, driver's hands. All start as simple placeholders.

## Track and environment

1. Test track made of simple shapes, to test driving.
2. The same layout rebuilt as a city block with buildings, barriers, street lights and road markings.
3. Neon signs, billboards and night lighting.

## MVP

| Area | Included |
|---|---|
| Vehicle | 1 placeholder car with arcade physics |
| Camera | Cockpit view with placeholder wheel and dashboard |
| Track | 1 closed circuit with walls |
| Race | Countdown, laps, finish |
| Checkpoints | Ordered checkpoints and lap counting |
| UI | Speed, lap, timer, position, countdown, results |
| Opponents | A few AI cars following a path |
| Controls | Keyboard, and gamepad where the Input System provides it at no extra cost |

MVP success test: start a race, drive the laps in cockpit view against AI, finish, see position and time, restart.

## Roadmap

| Milestone | Phases | Proves |
|---|---|---|
| A — Foundations | 1–3 | Design, architecture, clean Unity project |
| B — It drives | 4–7 | Car drives well from the cockpit on a test track |
| C — It races | 8–11 | Full race with checkpoints, laps, HUD and AI (MVP) |
| D — It's NEON APEX | 12–16 | City, assets, traffic, audio, neon VFX |
| E — It's a game | 17–20 | Menus, progression, polish, final build |

The 20 phases are listed in the owner brief. One phase at a time, each tested by the owner before the next starts.

## Optional future ideas (not approved)

- Ghost car for time trials.
- Boost meter.
- Open-world expansion beyond the first district.
- Android build with touch controls.
