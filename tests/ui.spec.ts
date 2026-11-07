import { test, expect } from "@playwright/test";
test("delay, compare, approve, persist, reset and assistant API", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3100");
  await expect(
    page.getByRole("heading", { name: "Keep the kitchen one step ahead." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Introduce 8-minute delay" }).click();
  await expect(
    page.getByRole("heading", {
      name: "One delay. A ripple through the queue.",
    }),
  ).toBeVisible();
  await expect(page.locator(".baseline-panel .path-metrics")).toContainText(
    "28",
  );
  await expect(page.locator(".happy-panel .path-metrics")).toContainText("20");
  await page.getByRole("button", { name: "Review & apply plan" }).click();
  await page.getByRole("button", { name: "Approve preparation plan" }).click();
  await expect(
    page.getByRole("button", { name: "Plan approved" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Order queue", exact: true }).click();
  await expect(page.locator("tbody tr").nth(1)).toContainText("#1044");
  await page.reload();
  await expect(page.locator(".status-value")).toHaveText("Optimized");
  await page.getByRole("button", { name: "Ask Praxis", exact: true }).click();
  await page
    .getByPlaceholder("Why prepare #1044 first?")
    .fill("Why change the order?");
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/assistant") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Explain the plan" }).click();
  expect((await response).status()).toBe(200);
  await expect(page.locator(".assistant-answer")).toContainText("28");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Introduce 8-minute delay" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile screen, capacity and API rejection", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3100");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Kitchen settings" }).click();
  await page.getByLabel("Active preparation stations").selectOption("2");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".service-strip")).toContainText(
    "2 active prep stations",
  );
  await page.getByRole("button", { name: "Scenario lab", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reproducible by design." }),
  ).toBeVisible();
  expect(
    (
      await request.post("http://127.0.0.1:3100/api/assistant", {
        data: { question: "test", kitchen: {} },
      })
    ).status(),
  ).toBe(400);
});
