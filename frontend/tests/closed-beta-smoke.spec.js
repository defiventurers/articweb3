import { expect, test } from "@playwright/test";

const smokePath = "/?skipLoader=1&smokeProfile=1";

test.describe("closed beta smoke", () => {
  test("Arctic Dominion direct route opens the board shell", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=arctic-dominion");
    await expect(page.getByRole("button", { name: "All Games" })).toBeVisible();
    await expect(page.locator(".game-preview-screen")).toHaveCount(0);
  });

  test("Nine Ice Forts opens and starts a legal local match", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=nine-ice-forts");
    await expect(page.getByLabel("Nine Ice Forts cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the forts" }).click();
    await expect(page.getByLabel("Nine Ice Forts menu")).toBeVisible();
    await page.getByRole("button", { name: "Local Two Player" }).click();
    await expect(page.getByLabel("Nine Ice Forts game")).toBeVisible();

    await page.getByRole("gridcell", { name: "a7 empty" }).click();
    await expect(page.getByRole("gridcell", { name: "a7 occupied by blue" })).toBeVisible();
    await expect(page.getByText(/Coral places a scout/i)).toBeVisible();
  });

  test("Four-Wing Ice Hunt opens with the reference formation and alternates leopard then colony turns", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=four-wing-ice-hunt");
    await expect(page.getByLabel("Four-Wing Ice Hunt cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the hunt" }).click();
    await expect(page.getByLabel("Four-Wing Ice Hunt menu")).toBeVisible();
    await page.getByRole("button", { name: "Local Two Player" }).click();
    await expect(page.getByLabel("Four-Wing Ice Hunt game")).toBeVisible();
    await expect(page.locator(".fwh-board-lines .fwh-rail-reference-axis")).toHaveCount(20);
    await expect(page.locator(".fwh-board-lines .fwh-rail-court-grid")).toHaveCount(24);
    await expect(page.getByRole("gridcell", { name: "c22 open" })).toBeVisible();
    await expect(page.getByText(/8 active · 16 reserve/i)).toBeVisible();

    await page.getByRole("gridcell", { name: "outside leopard entry occupied by leopards" }).first().click();
    await page.getByRole("gridcell", { name: "c00 open" }).click();
    await expect(page.getByRole("gridcell", { name: "c00 occupied by leopards" })).toBeVisible();
    await expect(page.getByText(/Deploy one reserve coloniser/i)).toBeVisible();

    await page.getByRole("gridcell", { name: "c01 open" }).click();
    await expect(page.getByRole("gridcell", { name: "c01 occupied by cattle" })).toBeVisible();
    await expect(page.getByText(/Move one snow leopard/i)).toBeVisible();
  });

  test("Fishflow opens and resolves a complete relay-sowing turn", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=fishflow");
    await expect(page.getByLabel("Fishflow cover")).toBeVisible();

    await page.getByRole("button", { name: "Follow the current" }).click();
    await expect(page.getByLabel("Fishflow menu")).toBeVisible();
    await page.getByRole("button", { name: "Local Two Player" }).click();
    await expect(page.getByLabel("Fishflow game")).toBeVisible();

    await page.getByRole("gridcell", { name: "Blue pit 1 with 6 fish" }).click();
    await expect(page.getByText(/Blue Current sowed 20 fish.*2 relays.*7 fish banked/i)).toBeVisible();
    await expect(page.getByRole("gridcell", { name: "Coral pit 2 with 7 fish" })).toBeEnabled();
  });

  test("Break the Ice opens and resolves an exact-finish cowrie drill", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=break-the-ice");
    await expect(page.getByLabel("Break the Ice cover")).toBeVisible();

    await page.getByRole("button", { name: "Start the race" }).click();
    await expect(page.getByLabel("Break the Ice menu")).toBeVisible();
    await page.getByRole("button", { name: "Daily Cowrie Drill" }).click();
    await expect(page.getByLabel("Break the Ice daily drill")).toBeVisible();
    await expect(page.getByText("Blue rolled 5. Choose one runner.")).toBeVisible();

    await page.getByRole("button", { name: "Blue runner 1 on Home climb 1, legal move" }).click();
    await expect(page.getByText("Perfect route")).toBeVisible();
    await expect(page.getByText(/Best runner: Runner 1/i)).toBeVisible();
  });

  test("Ice Hunters opens and resolves a standard corner capture", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=ice-hunters");
    await expect(page.getByLabel("Ice Hunters cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the hunting ground" }).click();
    await expect(page.getByLabel("Ice Hunters menu")).toBeVisible();
    await page.getByRole("button", { name: "Local Two Player" }).click();
    await expect(page.getByLabel("Ice Hunters game")).toBeVisible();

    await page.getByRole("gridcell", { name: /n11 empty legal/i }).click();
    await expect(page.getByRole("gridcell", { name: /n11 occupied by goats/i })).toBeVisible();

    await page.getByRole("gridcell", { name: /n00 occupied by tigers legal/i }).click();
    await page.getByRole("gridcell", { name: /n22 empty capture target/i }).click();
    await expect(page.getByRole("gridcell", { name: /n22 occupied by tigers/i })).toBeVisible();
    await expect(page.getByText(/captured the scout on n11/i)).toBeVisible();
  });

  test("Sixteen Ice Warriors opens and completes an optional two-jump chain", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=sixteen-ice-warriors");
    await expect(page.getByLabel("Sixteen Ice Warriors cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the war table" }).click();
    await expect(page.getByLabel("Sixteen Ice Warriors menu")).toBeVisible();
    await page.getByRole("button", { name: "Chain Capture Drill" }).click();
    await expect(page.getByLabel("Sixteen Ice Warriors capture drill")).toBeVisible();

    await page.getByRole("gridcell", { name: "c04 occupied by aurora" }).click();
    await page.getByRole("gridcell", { name: "c22 empty" }).click();
    await expect(page.getByText(/continue the capture chain or end the turn/i)).toBeVisible();

    await page.getByRole("gridcell", { name: "c40 empty" }).click();
    await expect(page.getByText("Aurora Legion wins")).toBeVisible();
    await expect(page.getByText(/Every opposing soldier has been chopped/i)).toBeVisible();
  });

  test("Ruma Ice Puzzle completes the verified teaching current", async ({ page }) => {
    await page.goto("/?skipLoader=1&game=ruma-ice-puzzle");
    await expect(page.getByLabel("Ruma Ice Puzzle cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the Ruma" }).click();
    await expect(page.getByLabel("Ruma Ice Puzzle menu")).toBeVisible();
    await page.getByRole("button", { name: "Play Teaching Current" }).click();
    await expect(page.getByLabel("Ruma Ice Puzzle game")).toBeVisible();

    for (const pit of [3, 4, 3, 4, 2, 4]) {
      await page.getByRole("gridcell", { name: new RegExp(`Pit ${pit} with \\d+ fish, legal`, "i") }).click();
    }

    await expect(page.getByText("Ruma restored")).toBeVisible();
    await expect(page.getByText("All eight fish reached the Ruma in par 6.")).toBeVisible();
    await expect(page.getByRole("gridcell", { name: "Ruma store with 8 fish" })).toBeVisible();
  });

  test("smoke profile opens Player Hub", async ({ page }) => {
    await page.goto(smokePath);
    await expect(page.getByLabel("Player Hub")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play Open Ice" })).toBeVisible();
    await expect(page.getByRole("button", { name: "High Stakes Lab" })).toBeVisible();
  });

  test("High Stakes shell opens", async ({ page }) => {
    await page.goto(smokePath);
    await page.getByRole("button", { name: "High Stakes Lab" }).click();
    await expect(page.getByLabel("Locked Match Mode")).toBeVisible();
    await expect(page.locator("#screenHighStakes")).toBeVisible();
    await expect(page.getByLabel("Private room code")).toBeVisible();
  });

  test("invite deep link opens invited room", async ({ page }) => {
    await page.goto("/?skipLoader=1&smokeProfile=1&highStakesRoom=ABCD");
    await expect(page.getByLabel("Locked Match Mode")).toBeVisible();
    await expect(page.getByText("Invited Room ABCD")).toBeVisible();
    await expect(page.getByRole("button", { name: "Join Invited Room" })).toBeVisible();
  });
});
