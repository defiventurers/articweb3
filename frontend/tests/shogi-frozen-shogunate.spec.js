import { expect, test } from "@playwright/test";

test("Shogi opens directly on the playable board and accepts a legal move", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=shogi-frozen-shogunate");
  await expect(page.getByRole("heading", { name: "Frozen Shogunate" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByLabel("Shogi board").getByRole("gridcell")).toHaveCount(81);
  await expect(page.getByText("Crimson Shogunate", { exact: true })).toBeVisible();
  await page.getByRole("gridcell", { name: /9g, Crimson Shogunate Pawn/ }).click();
  await expect(page.getByRole("gridcell", { name: /9f, empty, legal destination/ })).toBeVisible();
  await page.getByRole("gridcell", { name: /9f, empty, legal destination/ }).click();
  await expect(page.getByText("Sapphire Shogunate", { exact: true })).toBeVisible();
  await expect(page.getByText(/moved Pawn/)).toBeVisible();
});

test("Shogi exposes its original-wording rules and sourced research", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=shogi-frozen-shogunate");
  await page.getByRole("button", { name: "Rulebook" }).click();
  await expect(page.getByRole("heading", { name: "Field Guide to the Frozen Shogunate" })).toBeVisible();
  await expect(page.getByText(/Pawn-drop mate/, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Research Notes" }).click();
  await expect(page.getByRole("heading", { name: /documented modern game with medieval ancestors/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Japan Shogi Association Official Match Rules/i })).toBeVisible();
});

test("Shogi is playable from the Heritage Board Arcade route", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=heritage-arcade");
  await expect(page.locator(".heritage-arcade-shell")).toBeVisible();
  await page.getByRole("heading", { name: "Shogi", exact: true }).click();
  await page.getByRole("button", { name: "Play Shogi", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Frozen Shogunate" })).toBeVisible();
  await expect(page.getByLabel("Shogi board").getByRole("gridcell")).toHaveCount(81);
  expect(page.url()).toContain("game=heritage-arcade");
});
