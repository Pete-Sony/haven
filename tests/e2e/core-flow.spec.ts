import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("individual completes a zero-typing support journey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help me now" }).click();
  await page.getByRole("button", { name: /Social pressure/ }).click();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();
  await expect(
    page.getByText(/Reviewed fallback|Personalized with GenAI/),
  ).toBeVisible();
  await expect(page.getByText("Words you can use")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Review and share/ }),
  ).toBeVisible();
});

test("caregiver path is judge-visible", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help someone now" }).click();
  await expect(
    page.getByRole("heading", {
      name: "What are you noticing around them?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Check safety/ }).click();
  await page.getByRole("button", { name: /Show the next step/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Stay present and offer one small choice.",
    }),
  ).toBeVisible();
});

test("prevention is a complete zero-typing, account-free journey", async ({
  page,
}) => {
  await page.goto("/prevent");
  await page.getByRole("button", { name: "Stress builds quickly" }).click();
  await page.getByRole("button", { name: "Call a trusted person" }).click();
  await page.getByRole("button", { name: "A shared room" }).click();
  await expect(page.getByText(/If stress builds quickly/i)).toBeVisible();
  await page.getByRole("button", { name: "Save on this device" }).click();
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Saved on this device")).toBeVisible();
});

test("observable danger routes immediately to 112", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help me now" }).click();
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

test("voice companion is prominent and never starts recording automatically", async ({
  page,
}) => {
  await page.goto("/");
  const headerCompanion = page
    .getByRole("banner")
    .getByRole("link", { name: "Talk to Haven" });
  await expect(headerCompanion).toBeVisible();
  await expect(headerCompanion).toHaveAttribute(
    "href",
    "/auth?next=/companion",
  );
  await expect(
    page.getByRole("main").getByRole("link", { name: "Talk to Haven" }),
  ).toHaveAttribute("href", "/auth?next=/companion");

  await page.goto("/companion");
  await expect(page.getByText(/Recording\./)).toHaveCount(0);
});

test("support and concern pages expose call actions, not website contacts", async ({
  page,
}) => {
  await page.goto("/resources");
  const resourceLinks = await page.locator(".resource-list a").all();
  expect(resourceLinks.length).toBeGreaterThan(0);
  for (const link of resourceLinks) {
    await expect(link).toHaveAttribute("href", /^tel:/);
  }
  await expect(page.getByText("Open directory")).toHaveCount(0);

  await page.goto("/report");
  const reportLinks = await page.locator(".report-call-actions a").all();
  expect(reportLinks.length).toBe(3);
  for (const link of reportLinks) {
    await expect(link).toHaveAttribute("href", /^tel:/);
  }
  await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
});

test("favicon assets are valid production responses", async ({ request }) => {
  for (const asset of ["/favicon.ico", "/icon.png", "/apple-icon.png"]) {
    const response = await request.get(asset);
    expect(response.ok()).toBe(true);
    expect(await response.body()).not.toHaveLength(0);
  }
});

test("saved support features require an account without gating urgent help", async ({
  page,
}) => {
  await page.goto("/companion");
  await expect(
    page.getByRole("heading", {
      name: "Sign in to speak instead of type.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Use immediate support" }),
  ).toHaveAttribute("href", "/");

  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", {
      name: "Sign in only if you want to save this card.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Skip and use Haven" }),
  ).toHaveAttribute("href", "/");
});

test("account page exposes email authentication when Google is disabled", async ({
  page,
}) => {
  await page.goto("/auth?next=/onboarding");
  await expect(
    page.getByRole("heading", { name: "Sign in to Haven" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Need an account? Create one" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue with Google" }),
  ).toHaveCount(0);
});
