import { expect, test } from "@playwright/test";

async function beginSanninMatch(page) {
  await expect(page.getByRole("heading", { name: "Sannin Shogi" })).toBeVisible();
  await page.getByRole("button", { name: "Begin match" }).click();
  const board = page.getByRole("grid", { name: "127-cell pointy-top hex board" });
  await expect(board.getByRole("gridcell")).toHaveCount(127);
  await expect(board.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
  return board;
}

test("Sannin Shogi opens directly and completes a legal local turn", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=sannin-shogi");
  const board = await beginSanninMatch(page);
  await expect(board.locator('image[href^="/assets/games/sannin-shogi/"]')).toHaveCount(54);
  await expect(board.locator('image[href*="shogi-frozen-shogunate"]')).toHaveCount(0);
  await board.getByRole("gridcell", { name: /First Pawn/i }).first().click();
  const destination = board.getByRole("gridcell", { name: /legal destination/i }).first();
  await expect(destination).toBeVisible();
  await destination.click();
  await expect(board.getByRole("gridcell", { name: /last move destination/i })).toHaveCount(1);
  await expect(page.getByText("Middle to move", { exact: true })).toBeVisible();
});

test("Heritage table 24 deep-link mounts Sannin and returns to its atlas", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=heritage-arcade&table=sannin-shogi&qa=keep");
  await beginSanninMatch(page);
  await page.getByRole("button", { name: "Exit" }).click();
  await expect(page.locator(".heritage-arcade-shell")).toBeVisible();
  const url = new URL(page.url());
  expect(url.searchParams.get("game")).toBe("heritage-arcade");
  expect(url.searchParams.has("table")).toBe(false);
  expect(url.searchParams.get("qa")).toBe("keep");
  await expect(page.locator(".compact-board")).toHaveCount(0);
});

test("opening table 24 from the Heritage atlas synchronizes the query", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=heritage-arcade");
  await page.getByRole("heading", { name: "Sannin Shogi", exact: true }).click();
  await page.getByRole("button", { name: "Play Sannin Shogi", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Begin match" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("table")).toBe("sannin-shogi");
});
