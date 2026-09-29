import { test, expect } from "playwright/test";
import { openApp, openMore, openProfile } from "./helpers/app";

for (const viewport of [
  { name: "small", width: 360, height: 800 },
  { name: "standard", width: 390, height: 844 },
  { name: "large", width: 412, height: 915 },
]) {
  test.describe(`responsive ${viewport.name}`, () => {
    test.use({ viewport });

    test("primary navigation has no horizontal overflow", async ({ page }) => {
      await openApp(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBe(false);
      await expect(page.getByText("More", { exact: true })).toBeVisible();
    });

    test("profile basics fit without clipping", async ({ page }) => {
      await openApp(page);
      await openProfile(page);

      const age = page.getByPlaceholder("Age");
      const height = page.getByPlaceholder("Height cm");
      await expect(age).toBeVisible();
      await expect(height).toBeVisible();

      const boxes = await Promise.all([age.boundingBox(), height.boundingBox()]);
      expect(boxes[0]).not.toBeNull();
      expect(boxes[1]).not.toBeNull();
      expect(boxes[0]!.width).toBeGreaterThan(0);
      expect(boxes[1]!.width).toBeGreaterThan(0);
    });

    test("More remains scrollable and usable", async ({ page }) => {
      await openApp(page);
      await openMore(page);
      await expect(page.getByText("Settings", { exact: true })).toBeVisible();
    });
  });
}
