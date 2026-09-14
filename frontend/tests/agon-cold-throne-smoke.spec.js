import { test, expect } from "@playwright/test";

test.describe("Agon — The Queen's Cold Throne", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?skipLoader=1&game=agon-cold-throne", { waitUntil: "domcontentloaded" });
  });

  test("opens directly on a playable 91-hex table and advances a legal move", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "The Queen’s Cold Throne" })).toBeVisible();
    await expect(page.getByText("DOCUMENTED RULES")).toBeVisible();
    await expect(page.locator(".agon-hex")).toHaveCount(91);
    await expect(page.locator('.agon-piece img[src="/assets/artic/pieces/blue-frost-king.png"]')).toHaveCount(2);
    await expect(page.locator('.agon-piece img[src="/assets/artic/pieces/pink-frost-king.png"]')).toHaveCount(2);
    await expect(page.locator('.agon-piece img[src*="snow-guard.png"]')).toHaveCount(12);
    await page.locator(".agon-hex.selectable").first().click();
    await expect(page.locator(".agon-hex.target").first()).toBeVisible();
    await page.locator(".agon-hex.target").first().click();
    await expect(page.getByText("TURN 2")).toBeVisible();
  });

  test("keeps the original rulebook and labeled research inside the game", async ({ page }) => {
    await page.getByRole("button", { name: "Rulebook" }).click();
    await expect(page.getByRole("heading", { name: "Field Guide to the Cold Throne" })).toBeVisible();
    await page.getByRole("button", { name: "Research Notes" }).click();
    await expect(page.getByRole("heading", { name: "Agon, not an ancient game" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Remaining uncertainties" })).toBeVisible();
  });

  test("fits a phone viewport without horizontal page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".agon-board")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
