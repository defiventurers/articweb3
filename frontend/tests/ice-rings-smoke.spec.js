import { expect, test } from "@playwright/test";

test("Ice Rings opens and completes a compulsory two-jump chain", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Ice Rings" }).click();
  await expect(page.getByLabel("Ice Rings cover")).toBeVisible();

  await page.getByRole("button", { name: "Enter the rings" }).click();
  await expect(page.getByLabel("Ice Rings menu")).toBeVisible();
  await page.getByRole("button", { name: "Ring Break Drill" }).click();
  await expect(page.getByLabel("Ice Rings capture drill")).toBeVisible();

  await page.getByRole("gridcell", { name: /r3s0 occupied by aurora legal source/i }).click();
  await page.getByRole("gridcell", { name: /r1s0 empty legal capture target/i }).click();
  await expect(page.getByText(/continue the compulsory jump chain/i)).toBeVisible();

  await page.getByRole("gridcell", { name: /r1s3 empty legal capture target/i }).click();
  await expect(page.getByText("Aurora Rings win")).toBeVisible();
  await expect(page.getByText(/Every opposing Pretwa guard has been captured/i)).toBeVisible();
});
