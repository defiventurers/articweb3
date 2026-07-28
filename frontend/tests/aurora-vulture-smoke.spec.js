import { expect, test } from "@playwright/test";

test("Aurora Vulture opens and completes the fourth-crow strike drill", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Aurora Vulture" }).click();
  await expect(page.getByLabel("Aurora Vulture cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the aurora star" }).click();
  await expect(page.getByLabel("Aurora Vulture menu")).toBeVisible();
  await page.getByRole("button", { name: "Fourth-Crow Strike Drill" }).click();
  await expect(page.getByLabel("Aurora Vulture fourth-crow strike drill")).toBeVisible();
  await page.getByRole("gridcell", { name: /North star point, occupied by Glacier Vulture, selectable/i }).click();
  await page.getByRole("gridcell", { name: /Lower-right crossing, empty, capture destination from o0 over i0/i }).click();
  await expect(page.getByRole("heading", { name: "Glacier Vulture breaks the flock" })).toBeVisible();
  await expect(page.getByText(/captured four crows/i)).toBeVisible();
});
