import { expect, test } from "@playwright/test";

test("Khasi Fishflow opens and completes a relay turn", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Khasi Fishflow" }).click();
  await expect(page.getByLabel("Khasi Fishflow cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the pools" }).click();
  await expect(page.getByLabel("Khasi Fishflow menu")).toBeVisible();
  await page.getByRole("button", { name: "Local Two Player" }).click();
  await expect(page.getByLabel("Khasi Fishflow game")).toBeVisible();
  await page.getByRole("button", { name: /Aurora pit 1 with 5 stones/i }).click();
  await expect(page.getByText(/relays.*captured/i)).toBeVisible();
});

test("Ruma Ice Puzzle follows the solved guided route", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Ruma Ice Puzzle" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle cover")).toBeVisible();
  await page.getByRole("button", { name: "Open the puzzle" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle menu")).toBeVisible();
  await page.getByRole("button", { name: "Guided Practice" }).click();
  await expect(page.getByLabel("Ruma Ice Puzzle game")).toBeVisible();
  for (let move = 0; move < 6; move += 1) {
    await page.getByRole("button", { name: /suggested move/i }).click();
  }
  await expect(page.getByText("Ruma complete")).toBeVisible();
  await expect(page.getByText(/All eight stones reached the Ruma/i)).toBeVisible();
});
