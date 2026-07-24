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
    await expect(page.getByRole("gridcell", { name: /Coral pit 1 with/ })).toBeEnabled();
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
