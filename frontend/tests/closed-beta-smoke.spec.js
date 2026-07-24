import { expect, test } from "@playwright/test";

const smokePath = "/?skipLoader=1&smokeProfile=1";

test.describe("closed beta smoke", () => {
  test("game library opens Arctic Dominion cover", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await expect(page.getByLabel("Game library")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play Arctic Dominion" })).toBeVisible();

    await page.getByRole("button", { name: "Play Arctic Dominion" }).click();
    await expect(page.getByLabel("Cover screen")).toBeVisible();
    await expect(page.getByRole("button", { name: "All Games" })).toBeVisible();
  });

  test("Nine Ice Forts opens and starts a legal local match", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Nine Ice Forts" }).click();
    await expect(page.getByLabel("Nine Ice Forts cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the forts" }).click();
    await expect(page.getByLabel("Nine Ice Forts menu")).toBeVisible();
    await page.getByRole("button", { name: "Local Two Player" }).click();
    await expect(page.getByLabel("Nine Ice Forts game")).toBeVisible();

    await page.getByRole("gridcell", { name: "a7 empty" }).click();
    await expect(page.getByRole("gridcell", { name: "a7 occupied by blue" })).toBeVisible();
    await expect(page.getByText(/Coral places a scout/i)).toBeVisible();
  });

  test("Four-Wing Ice Hunt opens and follows Parker's opening order", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Four-Wing Ice Hunt" }).click();
    await expect(page.getByLabel("Four-Wing Ice Hunt cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the hunt" }).click();
    await expect(page.getByLabel("Four-Wing Ice Hunt menu")).toBeVisible();
    await page.getByRole("button", { name: "Local Two Player" }).click();
    await expect(page.getByLabel("Four-Wing Ice Hunt game")).toBeVisible();

    await page.getByRole("gridcell", { name: "c22 empty" }).click();
    await expect(page.getByRole("gridcell", { name: "c22 occupied by leopards" })).toBeVisible();
    await expect(page.getByText(/first cattle piece/i)).toBeVisible();

    await page.getByRole("gridcell", { name: "c00 empty" }).click();
    await expect(page.getByRole("gridcell", { name: "c00 occupied by cattle" })).toBeVisible();
    await expect(page.getByText(/second snow leopard/i)).toBeVisible();
  });

  test("Fishflow opens and resolves a complete relay-sowing turn", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Fishflow" }).click();
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
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Break the Ice" }).click();
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
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Ice Hunters" }).click();
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
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Sixteen Ice Warriors" }).click();
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

  test("Crown Run opens and resolves a standard-on-king crown collapse", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Crown Run" }).click();
    await expect(page.getByLabel("Crown Run cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the royal track" }).click();
    await expect(page.getByLabel("Crown Run menu")).toBeVisible();
    await page.getByRole("button", { name: "Crown Collapse Drill" }).click();
    await expect(page.getByLabel("Crown Run crown collapse drill")).toBeVisible();

    await page.getByRole("button", { name: "Aurora Court kaangi 1 on Track 9, legal capture" }).click();
    await expect(page.getByText("Crown collapse confirmed")).toBeVisible();
    await expect(page.getByText(/already-exited piece survived/i)).toBeVisible();
  });

  test("Forty Glacier Guards opens and completes an optional two-jump breakthrough", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Play Forty Glacier Guards" }).click();
    await expect(page.getByLabel("Forty Glacier Guards cover")).toBeVisible();

    await page.getByRole("button", { name: "Enter the glacier grid" }).click();
    await expect(page.getByLabel("Forty Glacier Guards menu")).toBeVisible();
    await page.getByRole("button", { name: "Breakthrough Chain Drill" }).click();
    await expect(page.getByLabel("Forty Glacier Guards capture drill")).toBeVisible();

    await page.getByRole("gridcell", { name: /g42 occupied by aurora.*legal move/i }).click();
    await page.getByRole("gridcell", { name: /g44 empty capture target/i }).click();
    await expect(page.getByText(/continue the jump chain or end the turn/i)).toBeVisible();

    await page.getByRole("gridcell", { name: /g46 empty capture target/i }).click();
    await expect(page.getByText("Aurora Guard wins")).toBeVisible();
    await expect(page.getByText(/Every opposing guard has been removed/i)).toBeVisible();
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
