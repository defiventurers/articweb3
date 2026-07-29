import { expect, test } from "@playwright/test";

test("Khasi Fishflow opens and captures across an empty relay gap", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Khasi Fishflow" }).click();
  await expect(page.getByLabel("Khasi Fishflow cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the river board" }).click();
  await expect(page.getByLabel("Khasi Fishflow menu")).toBeVisible();
  await page.getByRole("button", { name: "Opposite Capture Drill" }).click();
  await expect(page.getByLabel("Khasi Fishflow capture drill")).toBeVisible();
  await page.getByRole("button", { name: /Aurora Current pit 1, 1 stones, legal relay/i }).click();
  await expect(page.getByText(/captured 4/i)).toBeVisible();
});

test("Ruma Ice Puzzle opens and solves the last-pebble drill", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Ruma Ice Puzzle" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle cover")).toBeVisible();
  await page.getByRole("button", { name: "Open the puzzle" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle menu")).toBeVisible();
  await page.getByRole("button", { name: "Last Pebble Drill" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle last pebble drill")).toBeVisible();
  await page.getByRole("button", { name: "Ordinary pit 4 with 1 pebbles" }).click();
  await expect(page.getByText("The Ruma holds all eight pebbles")).toBeVisible();
});
