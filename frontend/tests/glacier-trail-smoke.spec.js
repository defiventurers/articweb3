import { expect, test } from "@playwright/test";

test("Glacier Trail opens and lands the last counter exactly", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=glacier-trail");
  await expect(page.getByLabel("Glacier Trail cover")).toBeVisible();

  await page.getByRole("button", { name: "Begin the ascent" }).click();
  await expect(page.getByLabel("Glacier Trail menu")).toBeVisible();
  await page.getByRole("button", { name: "Exact Landing Drill" }).click();
  await expect(page.getByLabel("Glacier Trail exact landing drill")).toBeVisible();

  await page.getByRole("button", { name: /Aurora Caravan Counter 1 on Trail 24, legal move by 2/i }).click();
  await expect(page.getByText("Aurora Caravan reaches land")).toBeVisible();
  await expect(page.getByText(/All three counters passed beyond Kenda-ge/i)).toBeVisible();
});
