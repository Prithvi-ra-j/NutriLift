import { test, expect } from "@playwright/test";
import { openApp } from "./helpers/app";

test.describe("web accessibility smoke checks", () => {
  test("interactive buttons expose a visible or accessible name", async ({ page }) => {
    await openApp(page);

    const unnamed = await page.locator('button, [role="button"]').evaluateAll((nodes) =>
      nodes
        .map((node) => ({
          text: (node.textContent || "").trim(),
          aria: node.getAttribute("aria-label") || "",
        }))
        .filter((item) => !item.text && !item.aria)
    );

    expect(unnamed).toEqual([]);
  });

  test("keyboard focus can reach primary navigation", async ({ page }) => {
    await openApp(page);
    await page.keyboard.press("Tab");

    let reachedNavigation = false;
    for (let i = 0; i < 30; i++) {
      const label = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.getAttribute("aria-label") || active?.textContent?.trim() || "";
      });

      if (/Today|Train|Progress|Coach|More/.test(label)) {
        reachedNavigation = true;
        break;
      }

      await page.keyboard.press("Tab");
    }

    expect(reachedNavigation).toBe(true);
  });
});
