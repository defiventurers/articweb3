import { expect, test } from "@playwright/test";

test("Two Stones opens and solves the one-move lock drill", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Two Stones" }).click();
  await expect(page.getByLabel("Two Stones cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the ice lock" }).click();
  await expect(page.getByLabel("Two Stones menu")).toBeVisible();
  await page.getByRole("button", { name: "One-Move Lock Drill" }).click();
  await expect(page.getByLabel("Two Stones one-move lock drill")).toBeVisible();
  await page.getByRole("gridcell", { name: /North-west point, occupied by Aurora stone 1, selectable/i }).click();
  await page.getByRole("gridcell", { name: /Centre point, empty, legal destination from nw/i }).click();
  await expect(page.getByText("Aurora Stones locks the board")).toBeVisible();
  await expect(page.getByText(/Coral Stones has no legal move/i)).toBeVisible();
});
