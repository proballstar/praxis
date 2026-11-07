"use client";
import { useEffect, useState, useRef } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChefHat,
  Clock3,
  Flame,
  LayoutDashboard,
  MessageSquare,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Kitchen,
  Slot,
  fixture,
  delayed,
  baseline,
  optimizeKitchen,
  metrics,
  time,
  validateKitchen,
} from "@/lib/kitchen";
function Timeline({
  k,
  slots,
  kind,
}: {
  k: Kitchen;
  slots: Slot[];
  kind: "baseline" | "praxis";
}) {
  const horizon = Math.max(40, ...slots.map((s) => s.end + 4));
  const pct = (n: number) => `${(n / horizon) * 100}%`;
  return (
    <div className="timeline">
      <div className="timeline-axis">
        <span>ORDER</span>
        <div>
          {[0, 10, 20, 30, 40].map((n) => (
            <small key={n} style={{ left: pct(n) }}>
              {n === 0 ? "7:00" : `7:${n}`}
            </small>
          ))}
        </div>
      </div>
      {k.orders.map((o, i) => {
        const slot = slots.find((s) => s.id === o.id)!;
        return (
          <div className="timeline-row" key={o.id}>
            <div className="timeline-label">
              <i className={`order-dot color-${i}`} />
              <div>
                <b>#{o.id.slice(3)}</b>
                <small>{o.customer}</small>
              </div>
            </div>
            <div className="track">
              {[0, 10, 20, 30, 40].map((n) => (
                <i className="gridline" key={n} style={{ left: pct(n) }} />
              ))}
              {o.started !== undefined && (
                <div
                  className={`prep-bar elapsed color-${i}`}
                  style={{
                    left: pct(o.started),
                    width: pct(k.now - o.started),
                  }}
                />
              )}
              <div
                className={`prep-bar color-${i} ${kind === "praxis" ? "optimized" : ""}`}
                style={{ left: pct(slot.start), width: pct(slot.remaining) }}
                title={`${time(slot.start)}–${time(slot.end)}, station ${slot.lane + 1}`}
              >
                <span>{slot.remaining}m</span>
              </div>
              {slot.driverWait > 0 && (
                <div
                  className="waiting-bar"
                  title={`Courier waits ${slot.driverWait} minutes`}
                  style={{ left: pct(o.arrival), width: pct(slot.driverWait) }}
                />
              )}
              {slot.foodIdle > 0 && (
                <div
                  className="idle-bar"
                  title={`Food sits ${slot.foodIdle} minutes`}
                  style={{ left: pct(slot.end), width: pct(slot.foodIdle) }}
                />
              )}
              <span
                className="courier-marker"
                title={`Courier ETA ${time(o.arrival)}`}
                style={{ left: pct(o.arrival) }}
              >
                <Truck size={12} />
              </span>
              <span
                className="deadline-marker"
                title={`Pickup deadline ${time(o.deadline)}`}
                style={{ left: pct(o.deadline) }}
              />
              <span className="end-time" style={{ left: pct(slot.end) }}>
                {time(slot.end).replace(" PM", "")}
              </span>
            </div>
          </div>
        );
      })}
      <div className="timeline-footer">
        <span>
          <i className="legend-solid" />
          Preparation
        </span>
        <span>
          <i className="legend-wait" />
          Courier waiting
        </span>
        <span>
          <Truck size={12} />
          Courier ETA
        </span>
        <span>
          <i className="legend-deadline" />
          Pickup deadline
        </span>
      </div>
    </div>
  );
}
export default function Home() {
  const [k, setK] = useState<Kitchen>(fixture);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("Service overview");
  const [mode, setMode] = useState<"compare" | "baseline" | "praxis">(
    "compare",
  );
  const [applied, setApplied] = useState(false);
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("praxis-kitchen-v1");
      if (raw) {
        const saved = JSON.parse(raw);
        if (validateKitchen(saved.k)) {
          setK(saved.k);
          setApplied(saved.applied === true);
        }
      }
    } catch {
      setStorageError("Could not load saved service. A fresh sample is ready.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(
          "praxis-kitchen-v1",
          JSON.stringify({ k, applied }),
        );
      } catch {
        setStorageError(
          "Changes cannot be saved in this browser. Your current session still works.",
        );
      }
  }, [k, applied, loaded]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,[tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
      if (e.key === "Tab") {
        const items = focusables();
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal]);
  const sad = baseline(k),
    happy = optimizeKitchen(k),
    before = metrics(sad),
    after = happy.metrics;
  const saved = before.wait - after.wait;
  const live = applied ? happy.slots : sad;
  const reset = () => {
    setK(fixture());
    setApplied(false);
    setAnswer("");
    setToast("Same initial conditions restored. Ready to replay.");
  };
  const introduce = () => {
    setK(delayed(k));
    setApplied(false);
    setToast("Eight-minute delay recorded. Both plans recalculated.");
  };
  const approve = () => {
    setApplied(true);
    setModal("");
    setToast("Revised preparation queue approved. Active work stays in place.");
  };
  const pending = happy.slots.filter(
    (s) => k.orders.find((o) => o.id === s.id)?.started === undefined,
  );
  const explain = `${k.delay ? "The eight-minute delay extends order #1042 to 7:18 PM." : "No delay is currently active."} ${k.capacity === 1 && k.delay ? "Keep #1042 in progress, then prepare #1044 (7:18–7:22), followed by #1043 (7:22–7:34)." : `The recommended pending sequence is ${pending.map((s) => "#" + s.id.slice(3)).join(" → ")}.`} This reduces total courier waiting from ${before.wait} to ${after.wait} minutes and pickup lateness from ${before.lateness} to ${after.lateness} minutes. ${after.late} order(s) still miss their pickup deadline; this plan does not promise to recover time already lost. Search evaluated ${happy.examined} sequences; active preparation is never interrupted.`;
  async function ask() {
    if (!query.trim()) return;
    setBusy(true);
    setAnswer(explain);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, kitchen: k }),
      });
      const d = await r.json();
      if (d.explanation) setAnswer(d.explanation);
    } catch {
      setAnswer(
        explain + " Local explanation shown; the AI service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          praxis<span>✳</span>
        </a>
        <div className="merchant">
          <div className="merchant-avatar">W</div>
          <div>
            <b>The Willow Kitchen</b>
            <small>Merchant workspace</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {[
            { name: "Service overview", icon: LayoutDashboard },
            { name: "Order queue", icon: ChefHat },
            { name: "Scenario lab", icon: Activity },
          ].map((t) => (
            <button
              key={t.name}
              className={tab === t.name ? "active" : ""}
              onClick={() => setTab(t.name)}
              aria-label={t.name}
            >
              <t.icon size={18} />
              <span>{t.name}</span>
              {t.name === "Service overview" && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-story">
          <span>✳</span>
          <h3>
            Calm in the
            <br />
            middle of the rush.
          </h3>
          <p>
            A clearer next move.
            <br />
            For your kitchen and your couriers.
          </p>
          <div className="partner-label">
            <Truck size={13} />
            Made for delivery operations
          </div>
        </div>
        <div className="profile">
          <span>EL</span>
          <div>
            <b>Emma Laurent</b>
            <small>Kitchen manager</small>
          </div>
          <Settings2 size={16} />
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div>
            The Willow Kitchen <span>/</span> {tab}
          </div>
          <div className="header-status">
            <span className="sample-badge">INTERACTIVE DEMO</span>
            <i />
            Saved on this device{" "}
            <button
              aria-label="About this demo"
              onClick={() => setModal("about")}
            >
              <ShieldCheck size={17} />
            </button>
          </div>
        </header>
        <main>
          <div className="heading">
            <div className="eyebrow">
              DINNER SERVICE <i /> SATURDAY, NOVEMBER 7
            </div>
            <div className="title-row">
              <div>
                <h1>Keep the kitchen one step ahead.</h1>
                <p>A little coordination. Less waiting. Better pickups.</p>
              </div>
              <div className="heading-actions">
                <button className="secondary" onClick={reset}>
                  <RotateCcw size={14} />
                  Reset demo
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setModal("assistant");
                    setAnswer(explain);
                  }}
                >
                  <Sparkles size={15} />
                  Ask Praxis
                </button>
              </div>
            </div>
          </div>
          <div className="service-strip">
            <span>
              <i className="green-dot" />
              DINNER RUSH
            </span>
            <div>
              <Clock3 size={14} />
              7:04 PM <small>Simulated service time</small>
            </div>
            <div>
              <ChefHat size={15} />
              <b>{k.capacity}</b> active prep{" "}
              {k.capacity === 1 ? "station" : "stations"}
            </div>
            <button onClick={() => setModal("settings")}>
              Kitchen settings <ArrowUpRight size={13} />
            </button>
          </div>
          {storageError && (
            <div className="error" role="alert">
              {storageError}
            </div>
          )}
          <div className={`disruption ${k.delay ? "triggered" : ""}`}>
            <div className="disruption-icon">
              <Flame size={22} />
            </div>
            <div>
              <span className="eyebrow">
                {k.delay
                  ? "DISRUPTION DETECTED"
                  : "YOUR SERVICE, UNDER PRESSURE"}
              </span>
              <h2>
                {k.delay
                  ? "One delay. A ripple through the queue."
                  : "What happens when prep takes eight minutes longer?"}
              </h2>
              <p>
                {k.delay
                  ? "Order #1042 needs 8 extra minutes. The revised plan accounts for remaining work and courier pickup commitments."
                  : "Three orders. One prep station. Introduce a delay to see the difference a better sequence makes."}
              </p>
            </div>
            <button
              className={k.delay ? "secondary" : "primary"}
              onClick={k.delay ? () => setTab("Scenario lab") : introduce}
            >
              {k.delay ? "Explore the impact" : "Introduce 8-minute delay"}
              {k.delay ? <ArrowRight size={14} /> : <Zap size={14} />}
            </button>
          </div>
          <div className="stats">
            <div>
              <span>
                Orders in this service <ChefHat size={15} />
              </span>
              <strong>
                03 <small>orders</small>
              </strong>
              <p>1 preparing · 2 in the queue</p>
            </div>
            <div>
              <span>
                Courier waiting <Truck size={15} />
              </span>
              <strong>
                {applied ? after.wait : before.wait}
                <small>total minutes</small>
              </strong>
              <p>
                {k.delay && saved > 0 ? (
                  <em>{saved} min recoverable with Praxis</em>
                ) : (
                  "Projected across all three orders"
                )}
              </p>
            </div>
            <div>
              <span>
                Pickup lateness <Clock3 size={15} />
              </span>
              <strong>
                {applied ? after.lateness : before.lateness}
                <small>total minutes</small>
              </strong>
              <p>
                {applied ? after.late : before.late} orders past pickup deadline
              </p>
            </div>
            <div>
              <span>
                Kitchen coordination <Activity size={15} />
              </span>
              <strong className="status-value">
                {applied
                  ? "Optimized"
                  : k.delay
                    ? "Needs attention"
                    : "Preview mode"}
              </strong>
              <p>
                <i
                  className={k.delay && !applied ? "amber-dot" : "green-dot"}
                />
                {applied
                  ? "Revised queue approved"
                  : k.delay
                    ? "A better sequence is available"
                    : "Ready to test a disruption"}
              </p>
            </div>
          </div>
          {tab !== "Order queue" && (
            <>
              <section className="comparison-section">
                <div className="section-heading">
                  <div>
                    <h2>Same kitchen. Same delay. A different outcome.</h2>
                    <p>
                      Compare the original queue with a plan that looks ahead.
                    </p>
                  </div>
                  <div className="segments">
                    {(["compare", "baseline", "praxis"] as const).map((m) => (
                      <button
                        key={m}
                        className={mode === m ? "chosen" : ""}
                        onClick={() => setMode(m)}
                      >
                        {m === "compare"
                          ? "Compare"
                          : m === "baseline"
                            ? "Without Praxis"
                            : "With Praxis"}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={`comparison-grid ${mode !== "compare" ? "single" : ""}`}
                >
                  {mode !== "praxis" && (
                    <section className="panel baseline-panel">
                      <div className="panel-top">
                        <div className="path-icon">
                          <Clock3 size={19} />
                        </div>
                        <div>
                          <div className="eyebrow">THE SAD PATH</div>
                          <h3>Without Praxis</h3>
                        </div>
                        <span className="tag neutral">
                          First come, first served
                        </span>
                      </div>
                      <div className="path-subtitle">
                        The queue keeps moving. The pickup plan falls behind.
                      </div>
                      <Timeline k={k} slots={sad} kind="baseline" />
                      <div className="path-metrics">
                        <div>
                          <b>
                            {before.wait}
                            <small>min</small>
                          </b>
                          <span>Courier waiting</span>
                        </div>
                        <div>
                          <b>
                            {before.lateness}
                            <small>min</small>
                          </b>
                          <span>Pickup lateness</span>
                        </div>
                        <div>
                          <b>
                            {before.idle}
                            <small>min</small>
                          </b>
                          <span>Food sitting idle</span>
                        </div>
                      </div>
                      <div className="path-insight">
                        <Clock3 size={15} />
                        <p>
                          {k.delay
                            ? "Longer order #1043 stays ahead of the urgent, four-minute #1044. Couriers wait while the queue follows arrival order."
                            : "Orders follow arrival order, even when a shorter job has an earlier courier pickup."}
                        </p>
                      </div>
                    </section>
                  )}
                  {mode !== "baseline" && (
                    <section className="panel happy-panel">
                      <div className="panel-top">
                        <div className="path-icon">
                          <Sparkles size={19} />
                        </div>
                        <div>
                          <div className="eyebrow">THE HAPPY PATH</div>
                          <h3>With Praxis</h3>
                        </div>
                        <span className="tag green">
                          Constraint-aware planning
                        </span>
                      </div>
                      <div className="path-subtitle">
                        The same work, sequenced around the next pickup.
                      </div>
                      <Timeline k={k} slots={happy.slots} kind="praxis" />
                      <div className="path-metrics">
                        <div>
                          <b>
                            {after.wait}
                            <small>min</small>
                          </b>
                          <span>Courier waiting</span>
                        </div>
                        <div>
                          <b>
                            {after.lateness}
                            <small>min</small>
                          </b>
                          <span>Pickup lateness</span>
                        </div>
                        <div>
                          <b>
                            {after.idle}
                            <small>min</small>
                          </b>
                          <span>Food sitting idle</span>
                        </div>
                      </div>
                      <div className="path-insight">
                        <ShieldCheck size={15} />
                        <p>
                          Keep active preparation in place. Sequence pending
                          orders against courier ETAs and pickup deadlines,
                          within {k.capacity} available{" "}
                          {k.capacity === 1 ? "station" : "stations"}.
                        </p>
                      </div>
                    </section>
                  )}
                </div>
              </section>
              <section className="recommendation">
                <div className="recommendation-title">
                  <div className="sparkle-square">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="eyebrow">YOUR NEXT BEST MOVE</div>
                    <h2>
                      {applied
                        ? "A clearer plan. Ready for the team."
                        : `Prepare #${pending[0]?.id.slice(3)} before #${pending[1]?.id.slice(3)}.`}
                    </h2>
                  </div>
                  <span className="tag green">
                    {happy.examined} feasible sequences evaluated
                  </span>
                </div>
                <p>{explain}</p>
                <div className="recommendation-bottom">
                  <div>
                    <ShieldCheck size={14} />
                    Active work stays put. You approve every queue change.
                  </div>
                  <button
                    className="primary"
                    disabled={applied}
                    onClick={() => setModal("approve")}
                  >
                    {applied ? (
                      <>
                        <Check size={15} />
                        Plan approved
                      </>
                    ) : (
                      <>
                        Review & apply plan <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </section>
            </>
          )}
          {(tab === "Order queue" || tab === "Service overview") && (
            <section className="panel orders-panel">
              <div className="section-heading">
                <div>
                  <h2>
                    Your kitchen queue <span className="count">3</span>
                  </h2>
                  <p>
                    {applied
                      ? "Approved preparation sequence"
                      : "Current first-come-first-served queue"}{" "}
                    · all times are projected
                  </p>
                </div>
                <span className="tag neutral">Sample DoorDash orders</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ORDER</th>
                      <th>PREPARATION</th>
                      <th>COURIER ETA</th>
                      <th>PROJECTED READY</th>
                      <th>PICKUP STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.map((slot, i) => {
                      const o = k.orders.find((o) => o.id === slot.id)!;
                      return (
                        <tr key={o.id}>
                          <td>
                            <div className="order-cell">
                              <span
                                className={
                                  o.started !== undefined
                                    ? "order-number active-order"
                                    : "order-number"
                                }
                              >
                                {o.started !== undefined ? (
                                  <Flame size={15} />
                                ) : (
                                  i + 1
                                )}
                              </span>
                              <div>
                                <b>
                                  #{o.id.slice(3)} <small>{o.customer}</small>
                                </b>
                                <p>{o.items}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <b>{slot.remaining} min remaining</b>
                            <small>
                              {o.started !== undefined
                                ? "In progress · do not interrupt"
                                : `Station ${slot.lane + 1} · starts ${time(slot.start)}`}
                            </small>
                          </td>
                          <td>
                            <span className="cell-icon">
                              <Truck size={14} />
                              {time(o.arrival)}
                            </span>
                            <small>Deadline {time(o.deadline)}</small>
                          </td>
                          <td>
                            <b>{time(slot.end)}</b>
                            <small>
                              {slot.driverWait
                                ? `${slot.driverWait} min courier wait`
                                : `${slot.foodIdle} min food idle`}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`tag ${slot.late ? "orange" : "green"}`}
                            >
                              {slot.late
                                ? `${slot.late} min late`
                                : "Within pickup window"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "Scenario lab" && (
            <section className="panel lab-panel">
              <div className="section-heading">
                <div>
                  <h2>Reproducible by design.</h2>
                  <p>
                    Both paths use exactly the same order data, capacity, clock,
                    and delay.
                  </p>
                </div>
                <button className="secondary" onClick={reset}>
                  <RotateCcw size={14} />
                  Restore initial conditions
                </button>
              </div>
              <div className="lab-data">
                <div>
                  <span>01 / INITIAL STATE</span>
                  <h3>7:04 PM. Dinner is moving.</h3>
                  <p>
                    #1042 has completed 4 of 10 prep minutes. #1043 needs 12
                    minutes, and #1044 needs 4. One station handles one order at
                    a time.
                  </p>
                </div>
                <div>
                  <span>02 / THE DISRUPTION</span>
                  <h3>Eight minutes behind.</h3>
                  <p>
                    The active order needs eight additional minutes. Already
                    completed work is preserved. Both paths receive the same
                    event, once.
                  </p>
                  <button
                    disabled={k.delay === 8}
                    className="secondary"
                    onClick={introduce}
                  >
                    <Zap size={14} />
                    {k.delay
                      ? "Delay already active"
                      : "Inject identical delay"}
                  </button>
                </div>
                <div>
                  <span>03 / THE DECISION</span>
                  <h3>Find the best feasible sequence.</h3>
                  <p>
                    Exact search evaluates every pending order permutation. The
                    objective is 5 × pickup lateness + 2 × courier waiting +
                    food idle minutes.
                  </p>
                </div>
              </div>
            </section>
          )}
          <div className="bottom-note">
            <span>✳</span>
            <div>
              <h3>Built for the rush. Guided by the real constraints.</h3>
              <p>
                Praxis recommends. Your team decides. No live DoorDash
                connection is required for this demo.
              </p>
            </div>
            <button onClick={() => setModal("about")}>
              How it works <ArrowUpRight size={14} />
            </button>
          </div>
          <footer>
            <span>
              <i className="green-dot" />
              Local demo · deterministic scheduling engine
            </span>
            <span>Sample data, real calculations.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <div className="overlay" onClick={() => setModal("")}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={modal}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="Close dialog"
              onClick={() => setModal("")}
            >
              <X size={19} />
            </button>
            <div className="eyebrow">
              <Sparkles size={15} />
              PRAXIS / KITCHEN COORDINATION
            </div>
            {modal === "approve" ? (
              <>
                <h2>
                  A new sequence.
                  <br />
                  The same kitchen commitments.
                </h2>
                <p>{explain}</p>
                <ol className="approval-list">
                  {happy.slots.map((s) => (
                    <li key={s.id}>
                      <b>#{s.id.slice(3)}</b>
                      <span>
                        {time(s.start)} → {time(s.end)} · Station {s.lane + 1}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="fine-print">
                  Applying updates this demo’s queue only. It does not notify
                  couriers, change DoorDash estimates, or send instructions to
                  staff.
                </p>
                <button className="primary full" onClick={approve}>
                  <Check size={15} />
                  Approve preparation plan
                </button>
              </>
            ) : modal === "assistant" ? (
              <>
                <h2>What’s the next best move?</h2>
                <div className="assistant-answer" aria-live="polite">
                  {answer}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask();
                  }}
                >
                  <label>
                    Ask about this service
                    <input
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Why prepare #1044 first?"
                      maxLength={1000}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    {busy ? "Thinking…" : "Explain the plan"}
                    <ArrowRight size={14} />
                  </button>
                </form>
                <p className="fine-print">
                  Local explanations always work. OpenRouter is optional and can
                  only explain computed facts; it cannot apply a plan.
                </p>
              </>
            ) : modal === "settings" ? (
              <>
                <h2>Capacity changes the possibilities.</h2>
                <p>
                  One station prepares one order at a time. Change capacity to
                  rerun both paths under the same conditions.
                </p>
                <label>
                  Active preparation stations
                  <select
                    value={k.capacity}
                    onChange={(e) => {
                      setK({ ...k, capacity: Number(e.target.value) });
                      setApplied(false);
                    }}
                  >
                    {[1, 2, 3].map((n) => (
                      <option value={n} key={n}>
                        {n} {n === 1 ? "station" : "stations"}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary full" onClick={() => setModal("")}>
                  Done
                  <Check size={14} />
                </button>
              </>
            ) : (
              <>
                <h2>
                  A decision layer.
                  <br />A calmer dinner service.
                </h2>
                <p>
                  Praxis is an independent prototype for DoorDash merchants. It
                  uses sample orders, simulated courier arrival times, and
                  limited preparation capacity to find the best pending
                  sequence.
                </p>
                <p>
                  Started work cannot be interrupted. Exact search scores
                  lateness most heavily, then courier waiting, then food sitting
                  idle. It optimizes the modeled sequences, not every possible
                  real-world kitchen decision.
                </p>
                <p>
                  Orders and approvals are saved in this browser. There is no
                  live DoorDash integration, staff messaging, or cross-device
                  synchronization.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
