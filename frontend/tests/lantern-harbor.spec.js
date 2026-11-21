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

test("the guest directory reaches the flagship and all three other game setups", async ({page}) => {
  test.setTimeout(100000);
  await page.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...rest) {
      if (type.startsWith("webgl")) return null;
      return native.call(this, type, ...rest);
    };
  });
  await page.goto("/harbor.html?return=temple");
  const options = [
    ["Chaturanga Temple","Play Arctic Dominion",page.getByLabel("Cover screen")],
    ["Xiangqi Pavilion","Open Xiangqi table",page.getByRole("heading",{name:/Xiangqi.*Polar Command/i})],
    ["Shogi Palace","Open Frozen Shogunate",page.getByRole("heading",{name:"Frozen Shogunate"})],
    ["San You Qi Council Hall","Open Three Friends Chess",page.getByRole("heading",{name:/San You Qi/i})]
  ];
  for (const [hall,action,setup] of options) {
    await page.getByRole("dialog").getByRole("button",{name:hall}).click();
    await page.getByRole("link",{name:action,exact:true}).click();
    await expect(setup).toBeVisible({timeout:30000});
    await page.getByRole("link",{name:/← Lantern Harbor/}).click();
  }
  await page.goto("/?game=shogi-frozen-shogunate&skipLoader=1");
  await expect(page.getByRole("heading",{name:"Frozen Shogunate"})).toBeVisible();
  await expect(page.getByRole("link",{name:/← Lantern Harbor/})).toHaveCount(0);
});

test("orbit the assembled waterfront and inspect each hall at walking height", async ({page}, info) => {
  test.setTimeout(150000);
  await page.setViewportSize({width:1200,height:750});
  await page.goto("/harbor.html");
  await page.getByRole("button",{name:"Enter Lantern Harbor"}).click();
  const canvas=page.locator("canvas");
  await expect(page.getByRole("button",{name:"Walk forward"})).toBeVisible();
  async function turn(dx,dy) {
    await page.mouse.move(200,320);
    await page.mouse.down();
    await page.mouse.move(200+dx,320+dy,{steps:12});
    await page.mouse.up();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  await turn(490,-25);
  await canvas.screenshot({path:info.outputPath("waterfront.png")});
  for (const [key,name] of [["temple","Chaturanga Temple"],["pavilion","Xiangqi Pavilion"],["palace","Shogi Palace"],["council","San You Qi Council Hall"]]) {
    await page.goto("/harbor.html?return="+key);
    await expect(page.getByRole("button",{name:"Enter "+name,exact:true})).toBeVisible();
    await turn(75,-23);
    await canvas.screenshot({path:info.outputPath(key+"-exterior.png")});
    await page.keyboard.press("e");
    if (key==="temple") await expect(page.getByRole("button",{name:"Exit to harbor"})).toBeVisible();
    else await expect(page.getByRole("dialog",{name})).toBeVisible();
  }
});
