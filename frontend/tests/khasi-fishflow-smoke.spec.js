import { expect, test } from "@playwright/test";

test("Khasi Fishflow opens and resolves the partial-pit handicap toll", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Khasi Fishflow" }).click();
  await expect(page.getByLabel("Khasi Fishflow cover")).toBeVisible();
  await page.getByRole("button", { name: "Follow the highland current" }).click();
  await expect(page.getByLabel("Khasi Fishflow menu")).toBeVisible();
  await page.getByRole("button", { name: "Handicap Current Drill" }).click();
  await expect(page.getByLabel("Khasi Fishflow handicap drill")).toBeVisible();
  await page.getByRole("gridcell", { name: /Blue pit 1 with 1 stones.*legal sow/i }).click();
  await expect(page.getByText(/1 handicap stone/i)).toBeVisible();
});
