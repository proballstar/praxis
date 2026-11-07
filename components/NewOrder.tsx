"use client";
import { FormEvent, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MenuItem, NewOrder, estimatePrep } from "@/lib/service";
import { Button, Field, inputClass } from "./ui";

const ETA_CHOICES = [5, 10, 15, 20, 30, 45];

export function NewOrderForm({
  menu,
  onSubmit,
}: {
  menu: MenuItem[];
  onSubmit: (order: NewOrder) => Promise<boolean>;
}) {
  const [ref, setRef] = useState("");
  const [customer, setCustomer] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [prepOverride, setPrepOverride] = useState<number | null>(null);
  const [eta, setEta] = useState(20);
  const [busy, setBusy] = useState(false);

  const lines = useMemo(
    () =>
      menu
        .filter((m) => counts[m.id])
        .map((m) => ({ ...m, qty: counts[m.id] })),
    [menu, counts],
  );
  const prep = prepOverride ?? (estimatePrep(lines) || 10);
  const items = [
    ...lines.map((l) => `${l.qty} × ${l.name}`),
    ...(note.trim() ? [note.trim()] : []),
  ].join(", ");

  const change = (id: string, by: number) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + by) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const saved = await onSubmit({
      ref,
      customer,
      items,
      prep,
      etaMinutes: eta,
    });
    if (!saved) setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ticket number" hint="Leave blank to number it for you">
          <input
            className={inputClass}
            value={ref}
            maxLength={20}
            onChange={(e) => setRef(e.target.value)}
          />
        </Field>
        <Field label="Customer" hint="Optional">
          <input
            className={inputClass}
            value={customer}
            maxLength={60}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Items</legend>
        {menu.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {menu.map((m) => {
              const qty = counts[m.id] || 0;
              return (
                <div
                  key={m.id}
                  className={`flex min-h-12 items-center rounded-lg border ${qty ? "border-brand bg-soft" : "border-line bg-raised"}`}
                >
                  <button
                    type="button"
                    className="min-h-12 min-w-0 flex-1 px-3 text-left text-sm font-medium"
                    onClick={() => change(m.id, 1)}
                  >
                    <span className="block truncate">
                      {qty > 0 && (
                        <b className="mr-1 text-brand">{qty} ×</b>
                      )}
                      {m.name}
                    </span>
                  </button>
                  {qty > 0 && (
                    <button
                      type="button"
                      aria-label={`One less ${m.name}`}
                      className="grid size-12 shrink-0 place-items-center text-muted"
                      onClick={() => change(m.id, -1)}
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <input
          className={`${inputClass} mt-2`}
          aria-label="Other items"
          placeholder="Anything not listed"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
      </fieldset>

      <div>
        <p className="mb-1.5 text-sm font-semibold">Prep time</p>
        <div className="flex items-center gap-3">
          <Button
            aria-label="One minute less"
            onClick={() => setPrepOverride(Math.max(1, prep - 1))}
          >
            <Minus size={16} />
          </Button>
          <output className="w-20 text-center text-lg font-bold">
            {prep} min
          </output>
          <Button
            aria-label="One minute more"
            onClick={() => setPrepOverride(prep + 1)}
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold">Courier arrives in</p>
        <div className="flex flex-wrap gap-2">
          {ETA_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={eta === m}
              onClick={() => setEta(m)}
              className={`min-h-11 min-w-14 rounded-lg border px-3 text-sm font-semibold ${eta === m ? "border-brand bg-brand text-on-brand" : "border-line bg-raised"}`}
            >
              {m} min
            </button>
          ))}
          <input
            className={`${inputClass} w-24!`}
            aria-label="Courier arrives in minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            value={eta}
            onChange={(e) => setEta(Number(e.target.value))}
          />
        </div>
      </div>

      <Button
        tone="primary"
        type="submit"
        disabled={busy || !items}
        className="w-full"
      >
        Add to queue
      </Button>
    </form>
  );
}
