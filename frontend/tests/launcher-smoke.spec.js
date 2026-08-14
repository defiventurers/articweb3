import { test, expect } from "@playwright/test";

const gameBox = (page, gameId) => page.locator(`[data-game-id="${gameId}"]`);

test.describe("Arctic Game Kingdoms launcher", () => {
  test("world exposes all 21 playable game boxes and opens Crown Run through the cinematic handoff", async ({ page }) => {
    await page.goto("/?skipLoader=1");

    await expect(page.getByRole("heading", { name: "Arctic Dominion" })).toBeVisible();
    await expect(page.locator(".arctic-game-box")).toHaveCount(21);
    await expect(gameBox(page, "arctic-dominion")).toHaveAttribute("aria-pressed", "true");
    await expect(gameBox(page, "crown-run")).toHaveAttribute("aria-label", /Crown Run\. PLAY\./);
    await expect(page.getByRole("button", { name: /Collection 21/i })).toBeVisible();

    await gameBox(page, "crown-run").click();
    await expect(page.locator(".arctic-opening-sequence")).toBeVisible();
    await expect(page.getByRole("button", { name: "Return to Arctic Game Kingdoms" })).toBeVisible();
    await expect(page).toHaveURL(/game=crown-run/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Crown\s+Run/i })).toBeVisible();
  });

  test("collection mode keeps all 21 catalog entries accessible alongside the world", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await page.getByRole("button", { name: /Collection 21/i }).click();

    const collection = page.locator('aside[aria-label="Game collection"]');
    await expect(collection).toBeVisible();
    await expect(collection.locator(".collection-game")).toHaveCount(21);
    await expect(collection.getByRole("button", { name: /Crown Run/i })).toBeVisible();
  });

  test("compact-screen world keeps game boxes available without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?skipLoader=1");

    await expect(page.locator(".arctic-game-box")).toHaveCount(21);
    await expect(gameBox(page, "seven-ice-rings")).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
});
