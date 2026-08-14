import { test, expect } from "@playwright/test";

const catalogGameIds = [
  "arctic-dominion",
  "nine-ice-forts",
  "four-wing-ice-hunt",
  "fishflow",
  "break-the-ice",
  "ice-hunters",
  "sixteen-ice-warriors",
  "glacier-trail",
  "crown-run",
  "forty-glacier-guards",
  "sky-temple-run",
  "ice-rings",
  "cowrie-kingdoms",
  "two-stones",
  "aurora-vulture",
  "khasi-fishflow",
  "seven-ice-rings",
  "ruma-ice-puzzle",
  "polar-tablan",
  "sige",
  "aurora-ganjifa-academy"
];

test.describe("full Arctic Game Kingdoms route coverage", () => {
  test("every catalog identifier opens a real game application instead of the preview screen", async ({ page }) => {
    test.setTimeout(120000);

    for (const gameId of catalogGameIds) {
      await test.step(`${gameId} mounts its application route`, async () => {
        await page.goto(`/?skipLoader=1&game=${gameId}`, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`game=${gameId}`));
        await expect(page.getByRole("button", { name: /All Games/i })).toBeVisible();
        await expect(page.locator(".game-preview-screen")).toHaveCount(0);
        await expect(page.getByText("This kingdom is not playable yet.")).toHaveCount(0);
      });
    }
  });
});
