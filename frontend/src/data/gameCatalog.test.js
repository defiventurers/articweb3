import { describe, expect, it } from "vitest";
import { GAME_CATALOG, LANDING_GAME_CATALOG, getCatalogGame } from "./gameCatalog.js";

describe("game catalog discovery policy", () => {
  it("keeps Heritage Board Arcade routable by its special game link", () => {
    expect(getCatalogGame("heritage-arcade")).toMatchObject({
      id: "heritage-arcade",
      available: true,
      hiddenFromLanding: true,
    });
    expect(GAME_CATALOG.some((game) => game.id === "heritage-arcade")).toBe(true);
  });

  it("removes Heritage Board Arcade from every landing-game collection", () => {
    expect(LANDING_GAME_CATALOG.some((game) => game.id === "heritage-arcade")).toBe(false);
    expect(LANDING_GAME_CATALOG).toHaveLength(21);
    expect(LANDING_GAME_CATALOG[0]?.id).toBe("arctic-dominion");
  });
});
