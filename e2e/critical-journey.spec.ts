import { test, expect } from "@playwright/test";
import { openApp, expectNavigation, openMore, openProfile } from "./helpers/app";

test.describe("NutriLift critical user journey", () => {
  test("loads the app and exposes the complete primary navigation", async ({ page }) => {
    await openApp(page);
    await expectNavigation(page);
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
  });

  test("profile setup journey is reachable and usable", async ({ page }) => {
    await openApp(page);
    await openProfile(page);

    await expect(page.getByText("Basics", { exact: true })).toBeVisible();
    await expect(page.getByText("About you", { exact: true })).toBeVisible();
    await expect(page.getByText("Daily targets", { exact: true })).toBeVisible();

    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByPlaceholder("Age")).toBeVisible();
    await expect(page.getByPlaceholder("Height cm")).toBeVisible();

    for (const label of ["male", "female", "other"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    for (const label of ["Calories", "Protein", "Carbs", "Fat"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }

    await expect(page.getByText("Save changes", { exact: true })).toBeVisible();
  });

  test("More is a real navigation surface and all sections are reachable", async ({ page }) => {
    await openApp(page);
    await openMore(page);

    for (const section of ["Body", "Supps", "Recovery", "Reports", "Account", "Settings"]) {
      await page.getByText(section, { exact: true }).click();
      await expect(page.getByText(section.toUpperCase(), { exact: true })).toBeVisible();
      await page.getByText("Menu", { exact: true }).click();
      await expect(page.getByText("MORE", { exact: true })).toBeVisible();
    }
  });

  test("food logging entry point is reachable from Today", async ({ page }) => {
    await openApp(page);
    await page.getByText("Log food", { exact: true }).first().click();

    await expect(page.getByText(/Log food/i).first()).toBeVisible();
    await expect(page.getByText("Search", { exact: true })).toBeVisible();
    await expect(page.getByText("Manual", { exact: true })).toBeVisible();
    await expect(page.getByText("Voice", { exact: true })).toBeVisible();
  });

  test("Coach failure state remains actionable instead of being a blocking error banner", async ({ page }) => {
    await openApp(page);
    await page.getByText("Coach", { exact: true }).click();

    await expect(page.getByText(/Coach needs a connection/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText(/AI gateway is unavailable/i)).toHaveCount(0);
  });
});
