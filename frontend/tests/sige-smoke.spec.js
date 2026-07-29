import { expect, test } from "@playwright/test";

test("Sige opens and divides one exact throw only at the centre", async ({ page }) => {
  await page.goto("/?skipLoader=1");
  await page.getByRole("button", { name: "Play Sige" }).click();
  await expect(page.getByLabel("Sige cover")).toBeVisible();
  await page.getByRole("button", { name: "Enter the protected route" }).click();
  await expect(page.getByLabel("Sige menu")).toBeVisible();
  await page.getByRole("button", { name: "Split Centre Drill" }).click();
  await expect(page.getByLabel("Sige split centre drill")).toBeVisible();
  await page.getByRole("button", { name: "Split 8 to finish both Aurora counters exactly in the centre" }).click();
  await expect(page.getByText("Aurora Route reaches the centre")).toBeVisible();
  await expect(page.getByText(/divided only at the centre/i)).toBeVisible();
});
