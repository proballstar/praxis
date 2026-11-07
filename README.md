# Praxis

A working restaurant operations workspace built with Next.js, TypeScript and Tailwind. No account or API key required.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000 (use the URL printed by Next if the port is occupied).

```sh
npm test           # reproducible deterministic scenarios
npm run build      # production + TypeScript validation
npm start          # production server after building
```

Optional AI: copy `.env.example` to `.env.local`, supply `OPENROUTER_API_KEY`, and restart. The key stays server-side. With a key, restaurant state and questions are sent to OpenRouter. Without one, the local intent parser handles party feasibility, server callouts and service summaries. LLM tools invoke the same deterministic planner; proposals require approval. Arbitrary conversational requests are limited by the selected model; the fallback supports the displayed examples.

## Try the core flow

1. Open Live floor: select tables, check in Davis, seat Thompson, and inspect the kitchen/server loads.
2. Open What-if lab → **Early party of six + delayed departure**. This creates a copy, extends Williams by 30 minutes, and checks Anderson in 45 minutes early.
3. Compare: Anderson moves from the planned T07 slot at 7:30 PM to T08 at 6:45 PM. Wilson’s later reservation moves from T08 to T07, avoiding the commitment on T08. Seated guests remain fixed.
4. Apply to live service. Anderson can now be seated from Up next. Select an occupied table to delay it, advance its order, or mark it departed.
5. Ask Praxis “Can we accept six people at 7:30?” or “Jamie called out.” Review the proposal before approving.
6. Team & setup supports table capacity editing, new tables, new staff, and duty toggles. Reservations supports adding bookings. Reset sample service restores the fixture.

## Planning assumptions

- Single simulated evening, initially 6:45 PM. The clock button advances five minutes; there is no background wall-clock drift.
- One party per table; tables cannot be combined. No seated guests are moved. Seated tables remain blocked until their expected release (overdue parties block at least another five minutes until departure or delay is entered).
- Reservation intervals are allocated first in arrival order. Checked-in parties can arrive early and are allocated in remaining gaps, using their actual availability now. No assignment overlaps another commitment, exceeds capacity, or selects an inactive server.
- Five-minute search increments and a three-hour maximum wait. The planner is a deterministic greedy lookahead heuristic, not a guarantee of global optimality. It scores delay first, unused seats next, and balances cumulative planned guest covers among active servers. Durations are averages of sample historical parties within one guest of the requested size, with defaults if no matching records exist.
- “Delayed / unassigned” means plans starting after the expected arrival, or parties with no feasible fit. It is not a count of overlaps: actual table overlaps are prohibited. Wait is the sum of projected minutes for waiting parties, not a guest-weighted average.
- Servers have unlimited concurrent guest capacity in this minimal model; workload is a soft objective. A callout prevents new assignments but preserves existing server labels, with an explicit manager handoff warning.
- Kitchen load is an advisory simplified model: queued/cooking guest covers divided by 12 covers per active cook. It warns managers to pace orders when overloaded. It does not run a kitchen scheduler or block seating.
- Reservation holds on the floor show planned bookings within 45 minutes. Later bookings appear in the guestbook and planner.
- Browser localStorage stores the whole service on this device. No backend database, multiuser sync, live POS integration, or automatic provider connection. Use sample names or non-sensitive demo data. Reset is immediate and replaces the local service.

## Validation

`npm test` covers capacity, overlap avoidance, unavailable servers, early check-in, delayed departure, immutable seated commitments, unassignable parties, seating guards, and order/departure transitions. `npm run build` checks production compilation and types. OpenRouter live calls require your own key and are not part of the automated test suite.

Browser checks (requires a running app on port 3000):

```sh
npx playwright install chromium
npm run test:ui
```

The browser suite verifies the applied disruption, reload persistence, local assistant proposal approval UI, and a 390px viewport without horizontal overflow. Live OpenRouter calls are not verified without credentials. Dependency audit is clean; a PostCSS override keeps Next's transitive version patched.
