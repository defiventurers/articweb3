import { expect, test } from "@playwright/test";

test("San You Qi opens on the finalized Arctic board with all 54 WebP pieces", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");

  await expect(page.getByRole("heading", { name: /SAN YOU QI/i })).toBeVisible();
  await expect(page.getByText("THREE FRIENDS CHESS", { exact: true })).toBeVisible();
  await expect(page.getByText("135 + C1–C24", { exact: true })).toBeVisible();
  await expect(page.getByText("18 each / 54 total", { exact: true })).toBeVisible();

  const board = page.locator(".san-you-qi-board-svg");
  await expect(board).toBeVisible();
  await expect(board.locator("img.san-you-qi-board-image")).toHaveAttribute(
    "src",
    "/assets/heritage-arcade/board/sanyou-arctic-board.png",
  );
  await expect(page.locator(".san-you-qi-piece-button")).toHaveCount(54);

  await expect(page.getByTestId("piece-red-soldier-1").locator("img")).toHaveAttribute(
    "src",
    /red_team_NWfacing_soldier\.webp$/,
  );
  await expect(page.getByTestId("piece-red-general-1").locator("img")).toHaveAttribute(
    "src",
    /red_team_backfacing_general\.webp$/,
  );
  await expect(page.getByTestId("piece-blue-general-1").locator("img")).toHaveAttribute(
    "src",
    /blue_team_SEfacing_general\.webp$/,
  );
  await expect(page.getByTestId("piece-green-general-1").locator("img")).toHaveAttribute(
    "src",
    /green_team_SWfacing_general\.webp$/,
  );
});

test("San You Qi allows the Red L1 Soldier to advance and then gives Green the turn", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");

  await page.getByTestId("piece-red-soldier-1").click();
  const targets = page.locator(".san-you-qi-node--target");
  await expect(targets).toHaveCount(1);
  await targets.first().click();

  await expect(page.locator(".turn-indicator")).toContainText("Wu / Green");

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator(".turn-indicator")).toContainText("Shu / Red");
});

test("San You Qi exit returns to the library", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");
  await page.getByRole("button", { name: /All Games/i }).click();
  await expect(page).not.toHaveURL(/game=san-you-qi/);
});

test("San You Qi opens through the Heritage Arcade table route", async ({ page }) => {
  await page.goto(
    "/?skipLoader=1&game=heritage-arcade&table=san-you-qi",
    { waitUntil: "domcontentloaded" },
  );

  await expect(page).toHaveURL(/game=heritage-arcade/);
  await expect(page).toHaveURL(/table=san-you-qi/);
  await expect(page.getByRole("heading", { name: /SAN YOU QI/i })).toBeVisible();
  await expect(page.locator(".san-you-qi-board-svg")).toBeVisible();
  await expect(page.locator(".san-you-qi-piece-button")).toHaveCount(54);
});
