import { expect, test } from "@playwright/test";

test("Polar Tablan opens and completes the finish-row lock drill", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Polar Tablan" }).click();
  await expect(page.getByLabel("Polar Tablan cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the polar route" }).click();
  await expect(page.getByLabel("Polar Tablan menu")).toBeVisible();
  await page.getByRole("button", { name: "Finish Row Drill" }).click();
  await expect(page.getByLabel("Polar Tablan finish row drill")).toBeVisible();
  await page.getByRole("button", { name: "Move A1 by 8" }).click();
  await expect(page.getByText(/locked 1 runner into the finish row/i)).toBeVisible();
  await expect(page.getByText(/Aurora Convoy wins the finish row/i)).toBeVisible();
});
