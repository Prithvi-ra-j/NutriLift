import { test, expect } from "@playwright/test";
import { openApp } from "./helpers/app";

test.describe("primary navigation", () => {
  test("Today opens correctly", async ({ page }) => {
    await openApp(page);
    await page.getByText("Today", { exact: true }).click();
    await expect(page.getByText("Meals", { exact: true })).toBeVisible();
    await expect(page.getByText("Training", { exact: true })).toBeVisible();
  });

  test("Train opens correctly", async ({ page }) => {
    await openApp(page);
    await page.getByText("Train", { exact: true }).last().click();
    await expect(page.getByText(/workout|training/i).first()).toBeVisible();
  });

  test("Progress opens correctly", async ({ page }) => {
    await openApp(page);
    await page.getByText("Progress", { exact: true }).last().click();
    await expect(page.locator("body")).toContainText(/progress|trend|history/i);
  });

  test("Coach opens correctly", async ({ page }) => {
    await openApp(page);
    await page.getByText("Coach", { exact: true }).last().click();
    await expect(page.locator("body")).toContainText(/Coach/i);
  });

  test("More opens correctly", async ({ page }) => {
    await openApp(page);
    await page.getByText("More", { exact: true }).last().click();
    await expect(page.getByText("MORE", { exact: true })).toBeVisible();
  });
});
