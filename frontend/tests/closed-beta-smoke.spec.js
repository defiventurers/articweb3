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

  test("planned game card opens a safe preview cover", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: "Open cover for Nine Ice Forts" }).click();
    await expect(page.getByLabel("Nine Ice Forts cover")).toBeVisible();
    await expect(page.getByText("This kingdom is not playable yet.")).toBeVisible();

    await page.getByRole("button", { name: "Return to game library" }).click();
    await expect(page.getByLabel("Game library")).toBeVisible();
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
