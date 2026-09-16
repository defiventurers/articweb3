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

  it("keeps Sannin Shogi directly routable but hidden from the landing collection", () => {
    expect(getCatalogGame("sannin-shogi")).toMatchObject({
      id: "sannin-shogi",
      available: true,
      hiddenFromLanding: true,
    });
    expect(GAME_CATALOG.some((game) => game.id === "sannin-shogi")).toBe(true);
    expect(LANDING_GAME_CATALOG.some((game) => game.id === "sannin-shogi")).toBe(false);
  });

  it("removes Heritage Board Arcade from every landing-game collection", () => {
    expect(LANDING_GAME_CATALOG.some((game) => game.id === "heritage-arcade")).toBe(false);
    expect(LANDING_GAME_CATALOG).toHaveLength(12);
    expect(LANDING_GAME_CATALOG[0]?.id).toBe("shogi-frozen-shogunate");
  });
});
