# Praxis — kitchen coordination

Independent restaurant operations prototype for DoorDash merchants. Three sample orders, one unexpected eight-minute preparation delay, and two comparable outcomes. No live DoorDash integration or merchant credentials required.

## Run

```sh
npm install
npm run dev
```

Open **http://localhost:3100**. Both development and production bind to `0.0.0.0`, so a phone on the same Wi-Fi can open `http://<your-computer-LAN-IP>:3100`. Each browser keeps its own local state.

```sh
npm test                 # deterministic engine scenarios
npm run build            # production compilation and TypeScript
npm start                # serves production build on port 3100
npx playwright install chromium
npm run test:ui          # requires app running on port 3100
```

## Replay the demo

1. Reset demo: clock is 7:04 PM; #1042 has completed 4 of 10 preparation minutes. One prep station is active.
2. Introduce the eight-minute delay. This is an idempotent event: it adds eight minutes of remaining work to the active job once, not on every click.
3. Compare the two timelines. The baseline keeps #1042 → #1043 → #1044. Praxis recommends #1042 → #1044 → #1043.
4. Review & apply the recommendation. Active work stays fixed. Only the pending queue changes; approval persists after reload.
5. Open Order queue for projected ready times, courier ETAs, pickup deadlines and individual waiting/lateness.
6. Ask Praxis to explain the recommendation, or change available stations in Kitchen settings. Changing capacity invalidates an earlier approval and recomputes both paths.

## Reproducible fixture

Times below are minutes after 7 PM.

| Order | Received | Prep minutes | Completed at 7:04 | Courier ETA | Pickup deadline |
| ----- | -------: | -----------: | ----------------: | ----------: | --------------: |
| #1042 |        0 |           10 |                 4 |          10 |              12 |
| #1043 |        1 |           12 |                 0 |          26 |              28 |
| #1044 |        2 |            4 |                 0 |          18 |              20 |

After the same eight-minute delay:

| Metric                |   FCFS | Praxis |
| --------------------- | -----: | -----: |
| Total courier waiting | 28 min | 20 min |
| Total pickup lateness | 22 min | 14 min |
| Food idle             |  0 min |  0 min |

These are actual engine outputs. Some delay is unavoidable: #1042 is already in progress, so no feasible reordering can remove its eight minutes of courier waiting. Praxis does not pretend all orders become on time.

## Model and constraints

- One station handles one order at a time. Stations are interchangeable. Active preparation is nonpreemptive: the scheduler preserves completed work and never interrupts or restarts it.
- FCFS assigns pending orders in receipt order to the earliest available station. Praxis enumerates every pending permutation and assigns work to the earliest available station. It finds the exact lowest-score **non-idling list sequence** for this small fixture, not a globally optimal real-world kitchen schedule. Deliberate idling, parallel subtasks, oven dependencies, batching, packaging time and handoff service time are outside the model.
- Objective: `5 × total pickup lateness + 2 × total courier waiting + total food idle`, all in minutes. Equal scores retain the baseline ordering. Pickup lateness = max(ready − deadline, 0); driver wait = max(ready − courier ETA, 0); food idle = max(courier ETA − ready, 0).
- Both paths consume the same immutable initial fixture, simulated clock, capacity and disruption. No random estimates or fabricated result metrics.
- The UI is intentionally scoped to three orders and 1–3 prep stations. No live order feed, courier messaging, staff scheduling, DoorDash API calls, or remote database.
- LocalStorage stores sample kitchen configuration and approval, using a versioned key independent of the previous seating demo. Reset restores initial conditions. No cross-device synchronization.

## Optional AI

Copy `.env.example` to `.env.local`, set `OPENROUTER_API_KEY`, and restart. `OPENROUTER_MODEL` defaults to `openai/gpt-4o-mini` (configurable). The server uses the AI SDK with an OpenAI-compatible OpenRouter provider. The key is never sent to the browser.

The API validates kitchen state and recomputes deterministic schedules before asking the model to explain the facts. The model has no mutation tools. No key, provider errors or timeouts fall back to local explanations. Requests send the question and sample kitchen state to OpenRouter when configured. Do not use sensitive live merchant data in this prototype. Live provider behavior requires a key and is not covered by the no-key test suite.

## Validation

Engine tests cover identical conditions, idempotent delay, fixture outputs, exact permutation choice, preserved active work, station non-overlap, capacity, malformed state and schedule rejection. Browser tests cover delay → comparison → approval → persisted queue → assistant API response → reset, mobile width, capacity changes, and invalid API input. Production build includes TypeScript checks.

The earlier floor-operations implementation is preserved in commit `28a73ab` on this branch before the kitchen redesign.

## Presentation demo

Open **http://localhost:3100/demo/index.html** for a five-slide walkthrough with screenshots captured from the running app. Use arrow keys or the on-screen arrows to navigate, `F` for fullscreen, and `N` for speaker notes. On a phone on the same Wi-Fi, replace `localhost` with the computer's LAN address. The images are screenshots from the same reproducible sample fixture.
