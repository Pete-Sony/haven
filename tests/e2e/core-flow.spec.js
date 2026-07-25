import { expect, test } from "@playwright/test";

test("primary journey proves the challenge-aligned relay and honest fallback", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /when words are hard/i })).toBeVisible();
  await expect(page.getByText(/no blank chat/i)).toBeVisible();

  await page.getByRole("button", { name: /i need help now/i }).first().click();
  await expect(page.getByRole("heading", { name: /make this moment smaller/i })).toBeVisible();
  await page.getByRole("button", { name: /social pressure/i }).click();
  await page.getByRole("button", { name: /check immediate safety/i }).click();
  await expect(page.getByRole("heading", { name: /is any of this happening now/i })).toBeVisible();
  await page.getByRole("button", { name: /none of these/i }).click();

  await expect(page.getByText(/reviewed fallback/i)).toBeVisible();
  await expect(page.getByText(/one next action/i).last()).toBeVisible();
  await page.getByRole("button", { name: /review support draft/i }).click();
  await expect(page.getByRole("heading", { name: /your support draft/i })).toBeVisible();
  await expect(page.getByText(/cannot see whether a message was sent/i)).toBeVisible();
  expect(errors).toEqual([]);
});

test("observable danger bypasses generation and renders the fixed India route", async ({ page }) => {
  let interventionRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/intervention")) interventionRequests += 1;
  });

  await page.goto("/");
  await page.getByRole("button", { name: /supporting someone/i }).first().click();
  await page.getByRole("button", { name: /check immediate safety/i }).click();
  await page.getByRole("button", { name: /not responding or cannot be awakened/i }).click();
  await page.getByRole("button", { name: /show emergency steps/i }).click();

  await expect(page.getByRole("heading", { name: /call 112 now/i })).toBeVisible();
  await expect(page.getByText(/fixed safety route · no ai used/i)).toBeVisible();
  await expect(page.getByText(/not responding/i).last()).toBeVisible();
  expect(interventionRequests).toBe(0);
});

test("narrow browser reflows without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "narrow-browser", "Narrow-browser assertion");
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(page.getByRole("button", { name: /i need help now/i }).first()).toBeVisible();
});
