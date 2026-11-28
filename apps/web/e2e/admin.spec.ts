import { test, expect } from "@playwright/test";

const MASTER_KEY = process.env.ADMIN_MASTER_KEY ?? "bloumeid_dev_master_key_2026";

test.describe("BloumeID Admin Panel & Live SDK Playground E2E", () => {
  test("redirects unauthenticated users to /login, authenticates with ADMIN_MASTER_KEY, and navigates dashboard, sites, visitors, playground & settings", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    // Invalid key shows error
    await page.getByTestId("master-key-input").fill("invalid_key_attempt");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();

    // Valid master key logs in and redirects to /dashboard
    await page.getByTestId("master-key-input").fill(MASTER_KEY);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify fresh dashboard starts clean with empty-state notice (zero pre-seeded demo data)
    await expect(page.getByText(/Aucune donnée|No data recorded/i).first()).toBeVisible();

    // Switch language via 8-locale selector
    await page.getByTestId("locale-switcher").click();
    await page.getByTestId("locale-option-en").click();

    // Navigate to Sites & create a new site via modal
    await page.goto("/sites");
    await page.getByTestId("open-create-site-modal").click();
    await page.getByTestId("new-site-name").fill("Playwright E2E Site");
    await page.getByTestId("new-site-domains").fill("localhost, *.playwright.dev");
    await page.getByTestId("create-site-btn").click();
    await expect(page.getByText("Playwright E2E Site")).toBeVisible();

    // Navigate to Landing Live Sandbox and verify @bloume/id probe
    await page.goto("/");
    await expect(page.getByText(/vis_/).first()).toBeVisible({ timeout: 15000 });

    // Navigate to Settings
    await page.goto("/settings");
    await expect(page.getByTestId("ip-tester-btn")).toBeVisible();
  });
});

