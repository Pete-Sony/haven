import { expect, test } from "@playwright/test";

test("support memory requires an explicit tap and account", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help for me" }).click();
  await page.getByRole("button", { name: /Social pressure/ }).click();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();

  await expect(
    page.getByRole("heading", {
      name: "Should Haven remember this first step?",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/does not save this conversation, audio, script/i),
  ).toBeVisible();

  await page.getByRole("button", { name: "This helped" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/auth?next=/",
  );
});

test("emergency flow bypasses support memory controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help for me" }).click();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: /Not responding/ }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();

  await expect(
    page.getByRole("heading", { name: "Call 112 now." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Should Haven remember this first step?",
    }),
  ).toHaveCount(0);
});

test("support-memory manager does not expose data while signed out", async ({
  page,
}) => {
  await page.goto("/account/memories");
  await expect(
    page.getByRole("heading", { name: "Saved support memories" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/auth?next=/account/memories",
  );
});
