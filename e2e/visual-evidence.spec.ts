import { test } from "playwright/test";
import { openApp, openMore, openProfile } from "./helpers/app";

test.describe("visual evidence", () => {
  test("capture critical empty/setup states", async ({ page }) => {
    await openApp(page);
    await page.screenshot({ path: "test-results/today.png", fullPage: true });

    await openProfile(page);
    await page.screenshot({ path: "test-results/profile.png", fullPage: true });

    await page.goBack();
    await openMore(page);
    await page.screenshot({ path: "test-results/more.png", fullPage: true });

    await page.getByText("Coach", { exact: true }).last().click();
    await page.screenshot({ path: "test-results/coach.png", fullPage: true });
  });
});
