import { expect, type Page } from "playwright/test";

export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
}

export async function expectNavigation(page: Page) {
  await expect(page.getByText("Today", { exact: true })).toBeVisible();
  await expect(page.getByText("Train", { exact: true })).toBeVisible();
  await expect(page.getByText("Progress", { exact: true })).toBeVisible();
  await expect(page.getByText("Coach", { exact: true })).toBeVisible();
  await expect(page.getByText("More", { exact: true })).toBeVisible();
}

export async function openProfile(page: Page) {
  const setup = page.getByRole("button", { name: "Set up" });
  if (await setup.count()) {
    await setup.click();
  } else {
    await page.getByRole("button", { name: "Open profile" }).click();
  }
  await expect(page.getByText("Profile", { exact: true })).toBeVisible();
}

export async function openMore(page: Page) {
  await page.getByText("More", { exact: true }).last().click();
  await expect(page.getByText("MORE", { exact: true })).toBeVisible();
}
