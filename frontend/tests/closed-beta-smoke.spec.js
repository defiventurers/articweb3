import { expect, test } from "@playwright/test";

const smokePath = "/?skipLoader=1&smokeProfile=1";

test.describe("closed beta smoke", () => {
  test("cover screen still renders without smoke bypass", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await expect(page.getByLabel("Cover screen")).toBeVisible();
    await expect(page.getByLabel("Tap anywhere to continue")).toBeVisible();
  });

  test("smoke profile opens Player Hub and RUN console", async ({ page }) => {
    await page.goto(smokePath);
    await expect(page.getByLabel("Player Hub")).toBeVisible();
    await expect(page.getByText("Smoke Penguin")).toBeVisible();
    await expect(page.getByRole("button", { name: "High Stakes Lab" })).toBeVisible();
    await page.getByRole("button", { name: "RUN" }).click();
    await expect(page.getByRole("heading", { name: "Test Runbook" })).toBeVisible();
    await expect(page.getByText("Mainnet readiness")).toBeVisible();
    await expect(page.getByText("Mainnet rehearsal drill")).toBeVisible();
    await expect(page.getByText("RUN snapshot")).toBeVisible();
  });

  test("smoke profile opens High Stakes Lab shell", async ({ page }) => {
    await page.goto(smokePath);
    await page.getByRole("button", { name: "High Stakes Lab" }).click();
    await expect(page.getByLabel("Locked Match Mode")).toBeVisible();
    await expect(page.locator("#screenHighStakes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Room" })).toBeVisible();
    await expect(page.getByLabel("Private room code")).toBeVisible();
  });

  test("invite deep link opens invited room panel", async ({ page }) => {
    await page.goto("/?skipLoader=1&smokeProfile=1&highStakesRoom=ABCD");
    await expect(page.getByLabel("Locked Match Mode")).toBeVisible();
    await expect(page.getByText("Invited Room ABCD")).toBeVisible();
    await expect(page.getByRole("button", { name: "Join Invited Room" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy Invite Link" })).toBeVisible();
  });

  test("mobile smoke path keeps core controls reachable", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile-only smoke check");
    await page.goto(smokePath);
    await expect(page.getByLabel("Player Hub")).toBeVisible();
    await expect(page.getByRole("button", { name: "High Stakes Lab" })).toBeVisible();
    await page.getByRole("button", { name: "RUN" }).click();
    await expect(page.getByRole("heading", { name: "Test Runbook" })).toBeVisible();
    await expect(page.getByText("Device matrix")).toBeVisible();
  });
});
