# Praxis

A live kitchen board for restaurants handling delivery orders. Enter orders as they arrive, tap as they move through the kitchen, and Praxis tells you what to cook next so food and couriers meet on time. When something slips, it recalculates and recommends a better order, and nothing changes until you approve it.

## Run it

```sh
npm install
npm run build
npm start
```

Open **http://localhost:3100** and set up your kitchen: name, cooking stations, and menu with prep times. There is nothing else to configure, and no account or API key.

Every device on the same Wi-Fi can open `http://<this-computer's-IP>:3100` and share the same live board, for example a tablet on the line and a phone at the pass. Keep the computer awake during service. Boards update within a few seconds.

## During a shift

1. **New order:** tap the items, confirm the prep time, and pick when the courier arrives.
2. **Start** an order when a station is free. Orders not worth cooking yet show when to start them, so food isn't ready long before the courier.
3. **Ready**, then **Picked up**, as each order moves along.
4. **Problem or change** on any order: it's taking longer, the courier's time changed, the courier is here, move it, or cancel it.
5. If a better cooking order appears, a banner names the change and what it saves. **Review change** shows both versions side by side. **Keep my order** dismisses it.
6. **Undo** (top bar) reverses mistaken taps. **Shift report** shows actual results from the taps recorded. Prep estimates that keep running over are worth raising in Settings.

To try it without real orders, use **Try it with sample orders** on an empty board. Sample orders are labeled, can be cleared, and never count in reports.

## How planning works

Each station cooks one order at a time. Orders already cooking are never moved or interrupted, and the queue is only reordered with approval.

- **Objective:** minimize `5 × minutes past the pickup window + 2 × minutes a courier waits + minutes food sits`.
- **Search:** with up to 7 queued orders, every possible order is checked. Longer queues use a deterministic heuristic (earliest-deadline insertion, then adjacent swaps), which finds a strong order rather than a proven best one. The review screen says which was used.
- **Hold times:** an order is held until 2 minutes before it needs to start to meet its courier, so short estimate overruns don't cause lateness.
- **Recommendations:** shown only when the gain is worth interrupting the line (a score drop of at least 6, with less total waiting or lateness). Ties keep your current order.
- **Prep estimates:** the longest dish on the ticket, plus 1 minute per additional dish. This is a rough rule, so the estimate can be changed on any order.

The planner's numbers are computed, never generated. On the reference case (one station, an in-progress order delayed by 8 minutes), moving a short order ahead of a long one takes courier waiting from 28 to 20 minutes and lateness from 22 to 14. The remaining lateness can't be recovered, and the app says so.

## Current limits

- **Orders are entered by hand.** There is no live connection to DoorDash or any other platform, because that requires partner API access. Courier times come from what staff see on the merchant tablet, and don't update themselves.
- **One kitchen, one computer.** Data is one file at `data/service.json` (set `PRAXIS_DATA_FILE` to move it). Back it up if your history matters. Hosting that lacks a persistent disk, such as Vercel, won't keep it.
- **No login.** Anyone on the same network can open the board and change it, and customer names are stored unencrypted. Use it only on a network you trust. Don't expose port 3100 to the internet.
- **Stations are interchangeable.** The model doesn't know about grill versus fryer, batching, or tasks that overlap on one ticket.

## AI assistant (optional)

**Ask Praxis** works without AI by giving a summary of the live plan. To let it understand questions and requests, add a key and restart:

```sh
cp .env.example .env.local   # then set OPENROUTER_API_KEY
```

The default model is `anthropic/claude-haiku-5.5`, chosen for reliable tool use at low cost. Set `OPENROUTER_MODEL` to use another model that supports tools.

With a key, staff can ask things like "Can we take 4 burgers with a courier in 15 minutes?" or say "the courier for 1043 is 10 minutes late." The assistant is an agent with three tools:

- `get_board` reads the live orders and plan.
- `what_if` tests changes on a private copy using the real planner.
- `propose_changes` validates changes and shows an **Approve** card.

The model never does the scheduling. Prep times and every before-and-after number come from the planner, and the card's text is generated from the validated change rather than written by the model. It can't change anything itself: only an Approve tap does, those changes apply all-or-nothing, and one Undo reverses them. It can't mark orders started, ready or picked up.

Each question is limited to 5 model steps and 500 output tokens per step, and times out after 20 seconds. The model receives ticket numbers, items, times and the menu, not customer names, though anything staff type in a question is sent as written. If AI is unavailable, Praxis falls back to the plan summary.

## Development

```sh
npm run dev       # hot reload on port 3100
npm test          # planner, shift rules and storage
npm run build
npx playwright install chromium
npm run test:ui   # needs a current build; starts its own server on 3101 with throwaway data
```

`lib/engine.ts` is the planner, `lib/service.ts` holds the shift rules, `lib/store.ts` handles saving, and `components/` holds the screens.

## Presentation

The slide deck at `/demo/index.html` shows the earlier scripted demo. Its screenshots predate this version.
