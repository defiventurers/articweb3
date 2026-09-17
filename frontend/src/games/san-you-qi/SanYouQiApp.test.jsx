import { describe, it, expect } from "vitest";
import SanYouQiApp from "./SanYouQiApp.jsx";

describe("SanYouQiApp component", () => {
  it("exports a React component", () => {
    expect(typeof SanYouQiApp).toBe("function");
  });
});
