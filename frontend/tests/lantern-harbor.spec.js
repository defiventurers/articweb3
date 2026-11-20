import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 960, height: 640 },
  hasTouch: true,
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  video: "on"
});

test("walk from the dock, enter the temple, play a move and return", async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install();
  await page.goto("/harbor.html");
  await page.getByRole("button", { name: "Rocco" }).click();
  await page.getByRole("button", { name: "Enter Lantern Harbor" }).click();
  await expect(page.getByRole("button", { name: "Walk forward" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("harbor.png") });

  // Advance the running controller at deterministic animation-frame intervals.
  await page.clock.pauseAt(new Date(Date.now() + 500));
  async function hold(key, milliseconds) {
    await page.keyboard.down(key);
    await page.clock.runFor(milliseconds);
    await page.keyboard.up(key);
  }
  await hold("a", 2400);
  await page.clock.runFor(500);
  await hold("w", 2700);
  await expect(page.getByRole("button", { name: "Enter Chaturanga Temple" })).toBeVisible();
  await page.keyboard.press("e");
  await expect(page.getByRole("heading", { name: "Chaturanga Temple" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exit to harbor" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("temple.png") });

  // Exercise actual touch pointer capture and release, independently of keyboard input.
  const pad = await page.getByRole("button", { name: "Walk forward" }).boundingBox();
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x:pad.x+pad.width/2,y:pad.y+pad.height/2}]});
  await page.clock.runFor(700);
  await touch.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
  await page.clock.resume();
  await page.getByRole("button", { name: "Visit game table" }).click();
  await page.getByRole("link", { name: /Play local Chaturaji/ }).click();
  const board = page.locator(".chaturaji-cell");
  await expect(board).toHaveCount(64, {timeout:30000});
  await board.nth(12).click();
  await board.nth(20).click();
  await expect(page.getByText("ACTION 1", {exact:true})).toBeVisible();
  await page.screenshot({ path: info.outputPath("local-game.png") });
  await page.getByRole("link", { name: /← Lantern Harbor/ }).click();
  await expect(page.getByRole("button", { name: "Enter Chaturanga Temple" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("context loss leaves all four halls and Quick Play accessible", async ({ page }) => {
  await page.goto("/harbor.html?return=temple");
  await expect(page.getByRole("button", { name:"Walk forward" })).toBeVisible();
  await page.locator("canvas").evaluate(canvas => canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
  const dialog = page.getByRole("dialog", {name:"Hall directory"});
  await expect(dialog.getByRole("link", {name:/Quick Play/})).toBeVisible();
  await expect(dialog.getByRole("button", {name:/Temple|Pavilion|Palace|Council Hall/})).toHaveCount(4);
});

test("portrait browser admits a guest and keeps both entry choices in reach", async ({page}, info) => {
  await page.setViewportSize({width:393,height:852});
  await page.goto("/play/");
  const choices=page.getByRole("navigation",{name:"Kingdoms games"});
  await expect(choices.getByRole("link",{name:"Quick Play"})).toHaveAttribute("href","/?collection=strategy");
  await choices.getByRole("link",{name:"Explore the Kingdoms"}).click();
  await page.getByRole("button",{name:"Piko"}).click();
  await page.getByRole("button",{name:"Enter Lantern Harbor"}).click();
  await expect(page.getByRole("button",{name:"Walk forward"})).toBeInViewport();
  await expect(page.getByRole("button",{name:"Halls",exact:true})).toBeInViewport();
  await page.screenshot({path:info.outputPath("portrait.png")});
});
