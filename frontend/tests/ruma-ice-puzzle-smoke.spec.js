import { expect, test } from "@playwright/test";

test("Ruma Ice Puzzle opens and completes the final drop lesson", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Ruma Ice Puzzle" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the Ruma" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle menu")).toBeVisible();
  await page.getByRole("button", { name: "Final Drop Lesson" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle final drop lesson")).toBeVisible();
  await page.getByRole("gridcell", { name: "Pit 4 with 1 counters" }).click();
  await expect(page.getByRole("heading", { name: "Ruma complete" })).toBeVisible();
  await expect(page.getByText(/Every counter is secured/i)).toBeVisible();
});
