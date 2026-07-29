import { expect, test } from "@playwright/test";

test("Seven Ice Rings opens and resolves a distant Sat-gol capture", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Seven Ice Rings" }).click();
  await expect(page.getByLabel("Seven Ice Rings cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the seven rings" }).click();
  await expect(page.getByLabel("Seven Ice Rings menu")).toBeVisible();
  await page.getByRole("button", { name: "Distant Capture Drill" }).click();
  await expect(page.getByLabel("Seven Ice Rings distant capture drill")).toBeVisible();
  await page.getByRole("button", { name: /Ring 1 with 1 stones, legal start capturing 4/i }).click();
  await expect(page.getByText(/captured 4 stones beyond the empty ring/i)).toBeVisible();
  await expect(page.getByText(/14 captured/i)).toBeVisible();
});
