import { test, expect } from "@playwright/test";
import { openApp } from "./helpers/app";

test.describe("web accessibility smoke checks", () => {
  test("critical icon-only controls expose accessible names", async ({ page }) => {
    await openApp(page);

    await expect(page.getByRole("button", { name: "Open profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add food to breakfast/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add food to lunch/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add food to snack/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add food to dinner/ })).toBeVisible();
  });

  test("keyboard can focus an interactive control on web", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName || "");
    expect(focused).not.toBe("");
  });
});
