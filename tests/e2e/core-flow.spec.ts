import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("individual completes a zero-typing support journey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help for me" }).click();
  await page.getByRole("button", { name: /Stress/ }).click();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();
  await expect(
    page.getByText(/Reviewed fallback|Personalized with Gemini/),
  ).toBeVisible();
  await expect(page.getByText("Words you can use")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Review and share/ }),
  ).toBeVisible();
});

test("caregiver path is judge-visible", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help for someone" }).click();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();
  await expect(page.getByText(/Stay present/)).toBeVisible();
});

test("observable danger routes immediately to 112", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help for me" }).click();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: "Not breathing normally" }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();
  await expect(
    page.getByRole("heading", { name: "Call 112 now." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 112" })).toHaveAttribute(
    "href",
    "tel:112",
  );
});

test("landing page has no automatically detectable critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) => item.impact === "critical"),
  ).toEqual([]);
});
