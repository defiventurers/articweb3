import { expect, test } from "@playwright/test";

test("Cowrie Kingdoms opens and splits Ashta into grace plus an eight capture", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Cowrie Kingdoms" }).click();
  await expect(page.getByLabel("Cowrie Kingdoms cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the kingdoms" }).click();
  await expect(page.getByLabel("Cowrie Kingdoms menu")).toBeVisible();
  await page.getByRole("button", { name: "Ashta Grace Drill" }).click();
  await expect(page.getByLabel("Cowrie Kingdoms Ashta grace drill")).toBeVisible();
  await expect(page.getByText(/Play the separate Grace entry first/i)).toBeVisible();
  await page.getByRole("button", { name: /Aurora runner 1 at home, legal grace entry/i }).click();
  await page.getByRole("button", { name: "Move 8", exact: true }).click();
  await page.getByRole("button", { name: /Aurora runner 2.*legal move 8/i }).click();
  await expect(page.getByText(/captured ember-1.*earned another cast/i)).toBeVisible();
});
