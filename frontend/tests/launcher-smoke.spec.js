import { test, expect } from "@playwright/test";

test.describe("Arctic game launcher", () => {
  test("desktop navigation exposes catalog state and preserves playable entry", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    await expect(page.getByRole("heading", { name: "Arctic Dominion" })).toBeVisible();
    await expect(page.getByText("01 / 21")).toBeVisible();

    await page.locator(".game-carousel__box-control--next").click();
    await expect(page.getByRole("heading", { name: "Nine Ice Forts" })).toBeVisible();
    await expect(page.getByText("02 / 21")).toBeVisible();

    await page.getByRole("tab", { name: "Select 09: Crown Run" }).click();
    await expect(page.getByRole("heading", { name: "Crown Run" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Coming soon/i })).toBeDisabled();

    await page.getByRole("tab", { name: "Select 02: Nine Ice Forts" }).click();
    await page.getByRole("button", { name: /Enter kingdom/i }).click();
    await expect(page).toHaveURL(/game=nine-ice-forts/);
    await expect(page.getByRole("heading", { name: "Nine Ice Forts" })).toBeVisible();
  });

  test("all 21 catalog spines select a corresponding game", async ({ page }) => {
    await page.goto("/?skipLoader=1");
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(21);

    for (let index = 0; index < 21; index += 1) {
      await tabs.nth(index).click();
      await expect(page.getByText(new RegExp(`Selected .* game ${index + 1} of 21\.`))).toBeVisible();
    }
  });

  test("mobile swipe advances the selected box without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?skipLoader=1");
    await expect(page.getByText("01 / 21")).toBeVisible();

    const stage = page.locator(".game-carousel__selected-stage");
    const box = await stage.boundingBox();
    if (!box) throw new Error("Carousel stage was not visible");
    await page.mouse.move(box.x + box.width * .72, box.y + box.height * .54);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .22, box.y + box.height * .54, { steps: 8 });
    await page.mouse.up();

    await expect(page.getByText("02 / 21")).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
});
