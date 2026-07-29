import { expect, test } from "@playwright/test";

test("Khasi Fishflow opens and resolves the opposite capture drill", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Khasi Fishflow" }).click();
  await expect(page.getByLabel("Khasi Fishflow cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the stone terraces" }).click();
  await expect(page.getByLabel("Khasi Fishflow menu")).toBeVisible();
  await page.getByRole("button", { name: "Opposite Capture Drill" }).click();
  await expect(page.getByLabel("Khasi Fishflow opposite capture drill")).toBeVisible();
  await page.getByRole("gridcell", { name: /Aurora pit 1 with 1 stones/i }).click();
  await expect(page.getByText(/1 relay.*captured 5 opposite stones/i)).toBeVisible();
});
