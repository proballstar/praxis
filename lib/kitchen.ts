export type Order = {
  id: string;
  customer: string;
  items: string;
  received: number;
  prep: number;
  arrival: number;
  deadline: number;
  started?: number;
  worked?: number;
};
export type Kitchen = {
  now: number;
  capacity: number;
  orders: Order[];
  delay: number;
};
export type Slot = {
  id: string;
  lane: number;
  start: number;
  end: number;
  remaining: number;
  driverWait: number;
  foodIdle: number;
  late: number;
};
export const time = (n: number) =>
  `${7 + Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")} PM`;
export function fixture(): Kitchen {
  return {
    now: 4,
    capacity: 1,
    delay: 0,
    orders: [
      {
        id: "DD-1042",
        customer: "Olivia R.",
        items: "2 × Crispy chicken bowls",
        received: 0,
        prep: 10,
        arrival: 10,
        deadline: 12,
        started: 0,
        worked: 4,
      },
      {
        id: "DD-1043",
        customer: "James K.",
        items: "1 × Margherita flatbread",
        received: 1,
        prep: 12,
        arrival: 26,
        deadline: 28,
      },
      {
        id: "DD-1044",
        customer: "Maya S.",
        items: "2 × Sesame noodle salads",
        received: 2,
        prep: 4,
        arrival: 18,
        deadline: 20,
      },
    ],
  };
}
export function delayed(k: Kitchen): Kitchen {
  return { ...structuredClone(k), delay: 8 };
}
function permutations<T>(xs: T[]): T[][] {
  if (xs.length === 0) return [[]];
  return xs.flatMap((x, i) =>
    permutations(xs.filter((_, j) => j !== i)).map((rest) => [x, ...rest]),
  );
}
export function schedule(k: Kitchen, sequence: string[]): Slot[] {
  if (!Number.isInteger(k.capacity) || k.capacity < 1 || k.capacity > 3)
    throw Error("Capacity must be between 1 and 3 stations.");
  if (!validateKitchen(k)) throw Error("Invalid kitchen state.");
  const free = Array(k.capacity).fill(k.now) as number[];
  const slots: Slot[] = [];
  const active = k.orders.filter((o) => o.started !== undefined);
  const pending = k.orders.filter((o) => o.started === undefined);
  if (active.length > k.capacity)
    throw Error("Cannot remove a station with an active order.");
  const ordered = [
    ...active,
    ...sequence
      .map((id) => pending.find((o) => o.id === id))
      .filter((o): o is Order => !!o),
  ];
  if (
    ordered.length !== k.orders.length ||
    new Set(ordered.map((o) => o.id)).size !== k.orders.length
  )
    throw Error("Every order must be scheduled exactly once.");
  for (const o of ordered) {
    const lane = free.indexOf(Math.min(...free));
    const remaining =
      o.prep - (o.worked || 0) + (o.started !== undefined ? k.delay : 0);
    const start = Math.max(free[lane], o.received);
    const end = start + remaining;
    free[lane] = end;
    slots.push({
      id: o.id,
      lane,
      start,
      end,
      remaining,
      driverWait: Math.max(0, end - o.arrival),
      foodIdle: Math.max(0, o.arrival - end),
      late: Math.max(0, end - o.deadline),
    });
  }
  return slots;
}
export function metrics(slots: Slot[]) {
  return {
    wait: slots.reduce((n, s) => n + s.driverWait, 0),
    idle: slots.reduce((n, s) => n + s.foodIdle, 0),
    late: slots.filter((s) => s.late > 0).length,
    lateness: slots.reduce((n, s) => n + s.late, 0),
    score: slots.reduce(
      (n, s) => n + s.late * 5 + s.driverWait * 2 + s.foodIdle,
      0,
    ),
  };
}
export function baseline(k: Kitchen) {
  return schedule(
    k,
    k.orders
      .filter((o) => o.started === undefined)
      .sort((a, b) => a.received - b.received || a.id.localeCompare(b.id))
      .map((o) => o.id),
  );
}
export function optimizeKitchen(k: Kitchen) {
  const pending = k.orders.filter((o) => o.started === undefined);
  if (pending.length > 7)
    throw Error("This exact-search demo supports up to seven pending orders.");
  let best = baseline(k);
  let examined = 0;
  for (const sequence of permutations(pending.map((o) => o.id))) {
    const slots = schedule(k, sequence);
    examined++;
    if (metrics(slots).score < metrics(best).score) best = slots;
  }
  return { slots: best, examined, metrics: metrics(best) };
}
export function validateKitchen(value: unknown): value is Kitchen {
  if (!value || typeof value !== "object") return false;
  const k = value as Kitchen;
  return (
    Number.isInteger(k.capacity) &&
    k.capacity >= 1 &&
    k.capacity <= 3 &&
    Number.isInteger(k.now) &&
    k.now >= 0 &&
    k.now <= 60 &&
    Number.isInteger(k.delay) &&
    k.delay >= 0 &&
    k.delay <= 30 &&
    Array.isArray(k.orders) &&
    k.orders.length === 3 &&
    new Set(k.orders.map((o) => o?.id)).size === 3 &&
    k.orders.every(
      (o) =>
        o &&
        typeof o.id === "string" &&
        typeof o.customer === "string" &&
        typeof o.items === "string" &&
        Number.isInteger(o.prep) &&
        o.prep > 0 &&
        o.prep <= 60 &&
        Number.isInteger(o.arrival) &&
        o.arrival >= 0 &&
        o.arrival <= 120 &&
        Number.isInteger(o.deadline) &&
        o.deadline >= o.arrival &&
        o.deadline <= 120 &&
        Number.isInteger(o.received) &&
        o.received >= 0 &&
        o.received <= k.now &&
        (o.started === undefined ||
          (Number.isInteger(o.started) &&
            o.started >= o.received &&
            o.started <= k.now)) &&
        (o.worked === undefined ||
          (Number.isInteger(o.worked) &&
            o.worked >= 0 &&
            o.worked <= o.prep &&
            o.started !== undefined)),
    )
  );
}
