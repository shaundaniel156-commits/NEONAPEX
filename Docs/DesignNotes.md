# NEON APEX — Design Notes

Reference notes for the project. Nothing here is implemented yet.

Sources:
1. **Owner brief** — the original step-by-step development brief given to Claude.
2. **ChatGPT planning chat** — the owner's earlier conversation with ChatGPT about a six-agent workflow (supplied as `NEON_APEX_DOC.docx`).

Where the two disagree, the disagreement is listed in section 4 and stays open until the owner decides.

---

## 1. Decisions the owner stated in the ChatGPT chat

| Topic | Decision |
|---|---|
| Game type | Open-world racing |
| Visual style | Realistic 3D |
| First platforms | Windows PC and Android |
| Multiplayer | Future expansion, not in the initial release |
| Engine / language | Unity, C# |
| Workflow | Six specialised agents in three build-and-test pairs, plus a coordinator |
| Delivery | Complete project files the owner can open in Unity, run and test |
| Approval | Agents must ask the owner before any major decision |

## 2. Six-agent workflow (from the chat)

| # | Agent | Role |
|---|---|---|
| 1 | Backend developer | Backend architecture and APIs, only when required |
| 2 | Backend QA | Independent API, security and integration tests |
| 3 | Unity game developer | The actual game. Lead implementation agent |
| 4 | Unity game QA | Gameplay, physics, UI, performance, Windows and Android tests |
| 5 | Database engineer | Data model and schema, only when justified |
| 6 | Database QA | Schema, migration and integrity tests |

A project orchestrator coordinates the six: keeps the plan, assigns tasks, prevents conflicting edits, reviews deliverables and prepares delivery.

Rules attached to the workflow:
- A feature is not complete because its developer says so. Its QA agent must test it.
- Bugs go back to the responsible developer, get fixed and are retested.
- Test reports list: test name, objective, execution status, expected result, actual result, pass/fail, severity, reproduction steps.
- Never report an unexecuted test as passed. Separate tests that ran from tests that could not run.
- Agents work on separate branches or isolated areas. No direct commits to main without approval.
- No secrets or credentials in source control.
- Backend and database are not built just to give those agents work. The initial game is offline-first.

Owner approval is required before:
- changing the game concept, engine, Unity version or major architecture
- introducing a backend technology, database or external infrastructure
- adding multiplayer infrastructure
- adding third-party or paid assets, packages, services or subscriptions
- deleting or replacing existing project files
- changing the repository structure
- publishing or deploying the game
- any irreversible change

Small, reversible implementation choices inside approved requirements need no approval.

## 3. Technical recommendations made by ChatGPT (not yet approved)

| Component | Recommendation |
|---|---|
| Engine | Unity 6 |
| Rendering | Universal Render Pipeline (chosen because of Android) |
| Input | Unity Input System (keyboard, controller, touch) |
| Camera | Cinemachine |
| World | Unity Terrain, additive scene loading, distance-based loading, LOD |
| Assets | Addressables where appropriate |
| Vehicle physics | WheelColliders first, evaluated against alternatives |
| UI | UI Toolkit or uGUI, one chosen consistently |
| Saving | Local JSON save system |
| Tests | Unity Test Framework |
| Future backend / database | Chosen later. PostgreSQL suggested for the database |

Architecture points:
- Offline-first, with service interfaces so multiplayer can be added later without a rewrite.
- Vehicle physics separate from vehicle visuals, and input separate from physics.
- ScriptableObjects for configuration such as vehicle handling.
- One Unity project for both platforms, with per-platform controls and graphics settings.
- World split into loadable regions: city, mountain, coastal, countryside. Build one polished region first.

Suggested folder layout: `Assets/` (Art, Audio, Materials, Prefabs, Scenes, Scripts, Settings, Tests), `Packages/`, `ProjectSettings/`, `Backend/` and `Database/` only if required, `Documentation/`, `README.md`.

Full feature list the chat says the game should *eventually* include:
- **World:** large explorable map, connected roads, discoverable locations, day/night cycle, weather
- **Vehicles:** multiple cars, selection, drifting, suspension, damage if justified, customisation later, vehicle audio
- **Racing:** free roam, street races, circuit races, time trials, checkpoints, laps, timers, positions, rewards
- **UI:** main menu, vehicle selection, settings, pause, race HUD, speedometer, gear indicator, mini-map, navigation, results
- **Progression:** profile, saves, race history, unlocks, currency, achievements

ChatGPT's suggested Milestone 1:
- main menu
- one detailed sports car with acceleration, braking and steering
- third-person chase camera
- one explorable environment with roads and basic traffic or objects
- one playable racing event
- speedometer and race HUD
- pause and restart
- basic local save
- Windows and Android input
- test builds for both platforms

ChatGPT's nine phases: discovery, architecture and planning, foundation, core gameplay, world expansion, platform optimisation, independent QA, final integration, delivery.

## 4. Conflicts between the two sources (open, owner to decide)

| Topic | Owner brief | ChatGPT chat |
|---|---|---|
| Game structure | Track-based racing. Open-world explicitly excluded | Open-world racing |
| Visual style | Arcade, neon, futuristic night city | Realistic 3D |
| Handling | Arcade, not simulation | "Realistic-feeling" handling |
| Camera | First-person cockpit only. No other views unless requested | Third-person chase camera in Milestone 1 |
| Platforms | Mobile controls excluded | Windows and Android with touch controls |
| Process | One phase at a time, test and approve each, owner learning as we go | Agents build as much as possible, then deliver for testing |
| Excluded features | Weather, damage, customisation, economy, procedural generation excluded | Weather, day/night, damage, customisation and currency listed as eventual features |
| Roadmap | 20 phases | 9 phases |

## 5. Status

- Phase 1 design proposal presented. Not approved.
- Reference image reviewed (cockpit view, city street, traffic).
- Repository contains only this file. No Unity project exists yet.
