import { expect, test } from "@playwright/test";

test("Aurora Ganjifa Academy opens and teaches compulsory follow-suit", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Aurora Ganjifa Academy" }).click();
  await expect(page.getByLabel("Aurora Ganjifa Academy cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the academy" }).click();
  await page.getByRole("button", { name: "Follow-Suit Lesson" }).click();
  await expect(page.getByLabel("Aurora Ganjifa Academy table")).toBeVisible();
  await page.getByRole("button", { name: /Taj 7, legal play/i }).click();
  await expect(page.getByText(/circle moves anticlockwise/i)).toBeVisible();
  await expect(page.getByText(/Glacier West collected the trick/i)).toBeVisible({ timeout: 5000 });
});
