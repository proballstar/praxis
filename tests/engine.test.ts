import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  delayed,
  baseline,
  optimizeKitchen,
  metrics,
  schedule,
  validateKitchen,
  Kitchen,
} from "../lib/kitchen";
function feasible(k: Kitchen, slots = optimizeKitchen(k).slots) {
  assert.equal(slots.length, 3);
  assert.equal(new Set(slots.map((s) => s.id)).size, 3);
  for (const a of slots) {
    assert.ok(a.start >= k.now);
    assert.ok(a.end >= a.start);
    assert.ok(a.lane < k.capacity);
    for (const b of slots.filter((b) => b !== a && b.lane === a.lane))
      assert.ok(a.end <= b.start || b.end <= a.start);
  }
  return slots;
}
test("same fixture, same delay, reproducible plans", () => {
  const k = fixture();
  const d = delayed(k);
  assert.equal(k.delay, 0);
  assert.equal(d.delay, 8);
  assert.deepEqual(optimizeKitchen(d), optimizeKitchen(delayed(fixture())));
  assert.deepEqual(delayed(d), d);
});
test("sad path preserves FCFS and exposes pickup conflicts", () => {
  const k = delayed(fixture());
  const slots = feasible(k, baseline(k));
  assert.deepEqual(
    slots.map((s) => s.id),
    ["DD-1042", "DD-1043", "DD-1044"],
  );
  assert.deepEqual(
    slots.map((s) => s.end),
    [18, 30, 34],
  );
  assert.equal(metrics(slots).wait, 28);
  assert.equal(metrics(slots).lateness, 22);
});
test("happy path is optimal among both pending sequences", () => {
  const k = delayed(fixture());
  const r = optimizeKitchen(k);
  feasible(k, r.slots);
  assert.equal(r.examined, 2);
  assert.deepEqual(
    r.slots.map((s) => s.id),
    ["DD-1042", "DD-1044", "DD-1043"],
  );
  assert.deepEqual(
    r.slots.map((s) => s.end),
    [18, 22, 34],
  );
  assert.equal(r.metrics.wait, 20);
  assert.equal(r.metrics.lateness, 14);
  for (const ids of [
    ["DD-1043", "DD-1044"],
    ["DD-1044", "DD-1043"],
  ])
    assert.ok(r.metrics.score <= metrics(schedule(k, ids)).score);
});
test("in-progress preparation never moves or restarts", () => {
  const k = delayed(fixture());
  const active = optimizeKitchen(k).slots[0];
  assert.equal(active.id, "DD-1042");
  assert.equal(active.start, 4);
  assert.equal(active.remaining, 14);
  assert.equal(active.end, 18);
  assert.equal(k.orders[0].worked, 4);
});
test("capacity honored with one, two and three stations", () => {
  for (const capacity of [1, 2, 3]) {
    const k = { ...delayed(fixture()), capacity };
    feasible(k);
    assert.ok(optimizeKitchen(k).metrics.score <= metrics(baseline(k)).score);
  }
});
test("initial schedule, reset fixture and idle metrics are real", () => {
  const k = fixture();
  assert.equal(baseline(k)[0].end, 10);
  assert.deepEqual(fixture(), k);
  const r = optimizeKitchen(k);
  assert.equal(
    r.slots.reduce((n, s) => n + s.foodIdle, 0),
    r.metrics.idle,
  );
});
test("invalid capacity, duplicate sequence and malformed state reject", () => {
  assert.throws(() => baseline({ ...fixture(), capacity: 0 }));
  assert.throws(() => schedule(fixture(), ["DD-1043", "DD-1043"]));
  assert.throws(() => schedule(fixture(), ["DD-1043", "DD-1044", "DD-1044"]));
  const k = fixture();
  k.orders[0].worked = 100;
  assert.equal(validateKitchen(k), false);
  assert.throws(() => baseline(k));
  assert.equal(validateKitchen({ orders: [] }), false);
});
