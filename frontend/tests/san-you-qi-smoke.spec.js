import { expect, test } from "@playwright/test";

test("San You Qi opens directly and displays the Y-board with 54 pieces", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");
  await expect(page.getByRole("heading", { name: /SAN YOU QI/i })).toBeVisible();
  await expect(page.getByText("Three Friends Chess", { exact: false })).toBeVisible();
  await expect(page.getByText("3", { exact: true })).toBeVisible();
  await expect(page.getByText("18 each / 54 total", { exact: true })).toBeVisible();
  await expect(page.locator(".san-you-qi-rulebook")).toBeVisible();
  await expect(page.locator(".san-you-qi-board-svg")).toBeVisible();
  await expect(page.locator(".san-you-qi-piece-button")).toHaveCount(54);
  await expect(page.locator(".turn-indicator")).toContainText("Shu / Red");
  await expect(page.getByText(/exactly two orthogonal steps/i).first()).toBeVisible();
});

test("San You Qi allows a legal first move and advances turn", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");
  await page.getByTestId("piece-red-soldier-1").click();
  await expect(page.locator(".san-you-qi-node--target")).toHaveCount(1);
  await page.getByTestId("node-red-0-0").click();
  await expect(page.locator(".turn-indicator")).toContainText("Wu / Green");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator(".turn-indicator")).toContainText("Shu / Red");
});

test("San You Qi exit returns to library", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=san-you-qi");
  await page.getByRole("button", { name: /All Games/i }).click();
  await expect(page).not.toHaveURL(/game=san-you-qi/);
  await expect(page.getByRole("link", { name: /Arctic Dominion home/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /Arctic Dominion game collection/i })).toBeVisible();
});

test("San You Qi opens through the Heritage Arcade table route", async ({ page }) => {
  await page.goto("/?skipLoader=1&game=heritage-arcade&table=san-you-qi", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/game=heritage-arcade/);
  await expect(page).toHaveURL(/table=san-you-qi/);
  await expect(page.getByRole("heading", { name: /SAN YOU QI/i })).toBeVisible();
  await expect(page.locator(".san-you-qi-board-svg")).toBeVisible();
  await expect(page.locator(".san-you-qi-piece-button")).toHaveCount(54);
});
