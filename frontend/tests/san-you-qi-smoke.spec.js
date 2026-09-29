import { expect, test } from "@playwright/test";

async function startLocal(page, players = 3) {
  await page.goto("/?skipLoader=1&game=san-you-qi");
  await expect(page.getByRole("heading", { name: /SAN YOU QI/i })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`^${players} players?`, "i") }).click();
  await page.getByRole("button", { name: /Start local match/i }).click();
  await expect(page.locator(".san-you-qi-board-svg")).toBeVisible();
}

test("San You Qi setup exposes local player counts and bot difficulty", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");

  await expect(page.getByRole("heading", { name: /SAN YOU QI/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^1 player/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^2 players/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^3 players/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Easy/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Medium/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Hard/i })).toBeVisible();
});

test("San You Qi starts a three-human local match on the finalized Arctic board", async ({ page }) => {
  await startLocal(page, 3);

  await expect(page.getByText("135 + 21 central", { exact: true })).toBeVisible();
  await expect(page.getByText("18 each / 54 total", { exact: true })).toBeVisible();

  const board = page.locator(".san-you-qi-board-svg");
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

test("San You Qi local three-human mode advances Red to Green", async ({ page }) => {
  await startLocal(page, 3);

  await page.getByTestId("piece-red-soldier-1").click();
  const targets = page.locator(".san-you-qi-node--target");
  await expect(targets).toHaveCount(1);
  await targets.first().click();

  await expect(page.locator(".turn-indicator")).toContainText("Wu / Green");
});

test("San You Qi online setup exposes room creation and joining", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");
  await page.getByRole("button", { name: /Online rooms/i }).click();

  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByLabel("Room visibility")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create room/i })).toBeVisible();
  await expect(page.getByLabel("Room code")).toBeVisible();
  await expect(page.getByRole("button", { name: /Join room/i })).toBeVisible();
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
  await expect(page.getByRole("button", { name: /Start local match/i })).toBeVisible();
});
