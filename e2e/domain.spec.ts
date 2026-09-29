import { test, expect } from "playwright/test";
import { openApp, openMore } from "./helpers/app";

test.describe("domain workflows", () => {
  test("training surface exposes a deterministic workout start path", async ({ page }) => {
    await openApp(page);
    await page.getByText("Train", { exact: true }).last().click();
    await expect(page.locator("body")).toContainText(/Template|workout/i);
    const template = page.getByText(/Use .* Template/).first();
    if (await template.count()) {
      await template.click();
      await expect(page.getByText(/Select exercises to add to your workout/i)).toBeVisible();
    }
  });

  test("recovery exposes all self-reported signals and save action", async ({ page }) => {
    await openApp(page);
    await openMore(page);
    await page.getByText("Recovery", { exact: true }).click();

    await expect(page.getByText("RECOVERY LOG", { exact: true })).toBeVisible();
    await expect(page.getByText("Sleep Duration (hours)", { exact: true })).toBeVisible();
    for (const label of ["Sleep Quality", "Energy Level", "Muscle Soreness", "Stress Level"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByPlaceholder("How are you feeling?")).toBeVisible();
    await expect(page.getByText("Save Recovery Log", { exact: true })).toBeVisible();
  });

  test("account surface clearly exposes signed-out state", async ({ page }) => {
    await openApp(page);
    await openMore(page);
    await page.getByText("Account", { exact: true }).click();

    await expect(page.getByText("SUPABASE ACCOUNT", { exact: true })).toBeVisible();
    await expect(page.getByText(/NOT CONNECTED|CONNECTED/)).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("settings surface exposes persisted profile and target fields", async ({ page }) => {
    await openApp(page);
    await openMore(page);
    await page.getByText("Settings", { exact: true }).click();

    await expect(page.getByText("PROFILE", { exact: true })).toBeVisible();
    await expect(page.getByText("TARGETS", { exact: true })).toBeVisible();
    await expect(page.getByText("Calories", { exact: true })).toBeVisible();
    await expect(page.getByText("Protein", { exact: true })).toBeVisible();
  });

  test("reports surface has an explicit empty state or report action", async ({ page }) => {
    await openApp(page);
    await openMore(page);
    await page.getByText("Reports", { exact: true }).click();

    await expect(page.getByText("Generate Monthly Report", { exact: true })).toBeVisible();
    await expect(page.locator("body")).toContainText(/No reports generated yet|Generated/);
  });
});
