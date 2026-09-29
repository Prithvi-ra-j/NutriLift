import { test, expect } from "playwright/test";
import { openApp } from "./helpers/app";

test.describe("failure-path UX", () => {
  test("Today does not expose the old fake empty target state", async ({ page }) => {
    await openApp(page);
    await expect(page.getByText("0g / 0g", { exact: true })).toHaveCount(0);
    await expect(page.getByText("there", { exact: true })).toHaveCount(0);
  });

  test("Coach exposes recovery actions when AI is unavailable", async ({ page }) => {
    await openApp(page);
    await page.getByText("Coach", { exact: true }).last().click();

    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Account" })).toBeVisible();
  });

  test("profile save is guarded when the name is empty", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: "Set up" }).click();

    const save = page.getByText("Save changes", { exact: true });
    await expect(save).toBeVisible();

    const disabled = await save.evaluate((node) => {
      const button = node.closest("button");
      return button?.hasAttribute("disabled") ?? false;
    });
    expect(disabled).toBe(true);
  });
});
