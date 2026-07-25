import { expect, test } from "@playwright/test";

test("keyboard users can reveal the skip link and move focus to main content", async ({
  page,
}) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("reduced-motion preference disables meaningful animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const motion = await page.locator("body").evaluate(() => {
    const probe = document.createElement("button");
    probe.className = "primary-button";
    document.body.append(probe);
    const styles = getComputedStyle(probe);
    const result = {
      animationDuration: styles.animationDuration,
      transitionDuration: styles.transitionDuration,
    };
    probe.remove();
    return result;
  });

  expect(motion.animationDuration).toBe("0.00001s");
  expect(motion.transitionDuration).toBe("0.00001s");
});

test("primary public journeys reflow at 200 percent without page-level horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 720 });

  for (const path of ["/", "/emergency", "/prevent", "/resources"]) {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);
  }
});

test("public emergency help bypasses authentication and exposes 112 immediately", async ({
  page,
}) => {
  await page.goto("/emergency");

  await expect(
    page.getByRole("heading", { name: /Emergency help/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Call 112/i })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await expect(page).toHaveURL(/\/emergency$/);
});

test("signed-out account-backed navigation preserves the intended destination", async ({
  page,
}) => {
  const destinations = [
    ["/account", "/auth?next=/account"],
    ["/companion", "/auth?next=/companion"],
    ["/check-in", "/auth?next=/check-in"],
  ] as const;

  for (const [path, expected] of destinations) {
    await page.goto(path);
    await expect(page).toHaveURL(
      new RegExp(`${expected.replace("?", "\\?")}$`),
    );
    await expect(
      page.getByRole("heading", { name: "Sign in to Haven" }),
    ).toBeVisible();
  }
});

test("password recovery pages expose accessible forms and safe signed-out feedback", async ({
  page,
}) => {
  await page.goto("/auth/forgot-password");
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await expect(page.getByLabel("Account email")).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(
    page.getByRole("button", { name: "Send reset instructions" }),
  ).toBeVisible();

  await page.goto("/auth/reset-password");
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();
  const password = page.getByLabel("New password");
  await expect(password).toHaveAttribute("minlength", "8");
  await password.fill("long-enough-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(
    page.getByText(
      /Open the reset link from your email|could not update the password/i,
    ),
  ).toBeVisible();
});

test("HTML responses carry a restrictive content security policy", async ({
  request,
}) => {
  for (const path of ["/", "/emergency", "/auth/forgot-password"]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const policy = response.headers()["content-security-policy"];
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("script-src");
  }
});
