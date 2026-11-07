import { createServer } from "node:http";
import { test, expect, Page } from "@playwright/test";

const seed = (page: Page, order: object) =>
  page.request.post("/api/service", {
    data: { action: { type: "addOrder", order } },
  });

const ticket = (page: Page, ref: string) =>
  page.locator("div.rounded-xl").filter({ hasText: `#${ref}` }).first();

test.describe.configure({ mode: "serial" });

test("a manager runs a shift from an empty install", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // First run: no fixture, no demo, just setup.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Set up your kitchen" }),
  ).toBeVisible();
  await page.getByLabel("Restaurant name").fill("Corner Kitchen");
  await page.getByLabel("Cooking stations").fill("1");
  await page.getByRole("button", { name: "Open the board" }).click();
  await expect(
    page.getByRole("heading", { name: "The board is clear" }),
  ).toBeVisible();

  // A real order through the form, estimated from the menu.
  await page.getByRole("button", { name: "Add the first order" }).click();
  const form = page.getByRole("dialog", { name: "New order" });
  await form.getByLabel("Ticket number").fill("1042");
  await form.getByLabel("Customer").fill("Olivia R.");
  const add = form.getByRole("button", { name: "Add to queue" });
  await expect(add).toBeDisabled();
  const burger = form.getByRole("button", { name: /^(\d+ ×)?Burger$/ });
  await burger.click();
  await burger.click();
  await expect(form.locator("output")).toHaveText("9 min");
  await form.getByRole("button", { name: "10 min", exact: true }).click();
  await add.click();
  await expect(form).toBeHidden();
  await page.getByRole("button", { name: "Start #1042" }).click();
  await expect(page.getByRole("timer")).toBeVisible();

  await seed(page, { ref: "1043", items: "1 × Pizza", prep: 12, etaMinutes: 26 });
  await seed(page, { ref: "1044", items: "2 × Salad", prep: 4, etaMinutes: 18 });
  await expect(page.getByRole("button", { name: "Start #1044" })).toBeVisible();

  // Stations are full, so nothing else can start.
  await expect(page.getByRole("button", { name: "Start #1043" })).toBeDisabled();

  // Something goes wrong, and the board reacts without being told to.
  await ticket(page, "1042").getByRole("button", { name: "Problem or change" }).click();
  await page.getByRole("button", { name: "Add 10 minutes to #1042" }).click();
  await expect(page.getByText("Cook #1044 before #1043")).toBeVisible();

  // Nothing changes until someone approves it.
  await page.getByRole("button", { name: "Review change" }).click();
  const review = page.getByRole("dialog");
  await expect(review.getByRole("cell", { name: "Courier waiting" })).toBeVisible();
  await review.getByRole("button", { name: "Apply new order" }).click();
  await expect(page.getByText("Cook #1044 before #1043")).toBeHidden();
  const queue = page.getByRole("region", { name: /Up next/ });
  await expect(queue.locator("b.text-lg").first()).toHaveText("#1044");

  // Second device on the same board, with no refresh.
  const tablet = await (await browser.newContext()).newPage();
  await tablet.goto("/");
  await expect(
    tablet.getByRole("region", { name: /Up next/ }).locator("b.text-lg").first(),
  ).toHaveText("#1044");

  // Survives a reload, and the other device picks up the change.
  await page.getByRole("button", { name: "Mark #1042 ready" }).click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: /Ready for pickup/ }).getByText("#1042"),
  ).toBeVisible();
  await expect(
    tablet.getByRole("region", { name: /Ready for pickup/ }).getByText("#1042"),
  ).toBeVisible({ timeout: 6000 });

  // Two people tap the same order: one wins, the other is told clearly.
  await tablet.waitForTimeout(100);
  await page.request.post("/api/service", {
    data: {
      action: {
        type: "start",
        id: (await (await page.request.get("/api/service")).json()).service.queue[0],
      },
    },
  });
  await tablet.getByRole("button", { name: "Start #1044" }).click();
  await expect(tablet.getByText("#1044 has already moved on")).toBeVisible();
  await tablet.close();

  // Undo recovers a mistaken tap.
  await page.getByRole("button", { name: /^Undo:/ }).click();
  await expect(page.getByRole("button", { name: "Start #1044" })).toBeVisible();

  // The assistant answers from the live board with no API key.
  await page.getByRole("button", { name: "Ask Praxis" }).click();
  await page.getByRole("button", { name: "What should we do next?" }).click();
  await expect(page.getByRole("dialog")).toContainText("Next: #1044");
  await page.getByRole("button", { name: "Close" }).click();

  // Hand off and read real results.
  await page.getByRole("button", { name: "Hand off #1042" }).click();
  await page.getByRole("button", { name: "Shift report" }).click();
  const shift = page.getByRole("dialog", { name: "This shift" });
  await expect(shift.getByText("Orders finished")).toBeVisible();
  await expect(
    shift.getByRole("button", { name: "End shift and clear the board" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close" }).click();

  // Settings apply live.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Cooking stations").fill("2");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Station 2 is free")).toBeVisible();

  expect(errors).toEqual([]);
});

test("the phone board fits, and sample orders stay out of the numbers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Up next (2)" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await page.getByRole("tab", { name: /Cooking/ }).click();
  await expect(page.getByText("Station 1 is free")).toBeVisible();
  await page.getByRole("tab", { name: /Up next/ }).click();
  for (const ref of ["1044", "1043"]) {
    await page.getByRole("button", { name: `Start #${ref}` }).click();
    await page.getByRole("tab", { name: /Cooking/ }).click();
    await page.getByRole("button", { name: `Mark #${ref} ready` }).click();
    await page.getByRole("tab", { name: /Ready/ }).click();
    await page.getByRole("button", { name: `Hand off #${ref}` }).click();
    if (ref === "1044") await page.getByRole("tab", { name: /Up next/ }).click();
  }
  await page.getByRole("button", { name: "Try it with sample orders" }).click();
  await expect(page.getByText("Sample orders are on the board")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Up next (2)" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Clear samples" }).click();
  await expect(
    page.getByRole("heading", { name: "The board is clear" }),
  ).toBeVisible();
});

test("an AI proposal changes nothing until someone approves it", async ({
  page,
}) => {
  let step = 0;
  const reply = (message: object, finish_reason: string) =>
    JSON.stringify({
      id: "x",
      created: 1,
      model: "m",
      choices: [{ index: 0, message, finish_reason }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  const fake = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        ++step % 2
          ? reply(
              {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "c1",
                    type: "function",
                    function: {
                      name: "propose_changes",
                      arguments: JSON.stringify({
                        changes: [
                          { kind: "add_time", ticket: "3000", minutes: 7 },
                        ],
                      }),
                    },
                  },
                ],
              },
              "tool_calls",
            )
          : reply(
              { role: "assistant", content: "Ready for your approval." },
              "stop",
            ),
      );
    });
  });
  await new Promise<void>((r) => fake.listen(3199, "127.0.0.1", r));
  try {
    await seed(page, { ref: "3000", items: "1 × Pizza", prep: 10, etaMinutes: 30 });
    await page.goto("/");
    const extra = async () =>
      (await (await page.request.get("/api/service")).json()).service.orders.find(
        (o: { ref: string }) => o.ref === "3000",
      ).extra;

    await page.getByRole("button", { name: "Ask Praxis" }).click();
    const chat = page.getByRole("dialog", { name: "Ask Praxis" });
    await chat.getByLabel("Your question").fill("3000 needs 7 more minutes");
    await chat.getByRole("button", { name: "Send" }).click();
    await expect(chat.getByText("Add 7 min to #3000")).toBeVisible();
    expect(await extra()).toBe(0);

    await chat.getByRole("button", { name: "Not now" }).click();
    await expect(chat.getByText("Not applied.")).toBeVisible();
    expect(await extra()).toBe(0);

    await chat.getByLabel("Your question").fill("Actually yes, add it");
    await chat.getByRole("button", { name: "Send" }).click();
    await chat.getByRole("button", { name: "Approve" }).click();
    await expect(chat.getByText("Applied. Undo is in the top bar.")).toBeVisible();
    expect(await extra()).toBe(7);
  } finally {
    fake.close();
    fake.closeAllConnections();
  }
});

test("the API refuses malformed requests", async ({ request }) => {
  const post = (url: string, data: unknown) => request.post(url, { data });
  expect((await post("/api/service", {})).status()).toBe(400);
  expect((await post("/api/service", { action: { type: "x" } })).status()).toBe(409);
  const ask = (messages: unknown) => post("/api/assistant", { messages });
  expect((await ask([])).status()).toBe(400);
  expect((await ask([{ role: "system", content: "x" }])).status()).toBe(400);
  expect(
    (await ask([{ role: "user", content: "x".repeat(1001) }])).status(),
  ).toBe(400);
});
