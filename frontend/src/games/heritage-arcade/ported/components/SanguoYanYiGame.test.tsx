// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import SanguoYanYiGame from "./SanguoYanYiGame";
import { createYanYiState } from "../game/sanguoYanYiRules";
import { YAN_YI_X, YAN_YI_Y } from "../game/sanguoYanYiPresentation";
let container: HTMLDivElement, root: Root;
const click = async (element: Element) => { await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); };
const button = (text: string) => [...container.querySelectorAll("button")].find(b => b.textContent?.includes(text) || b.getAttribute("aria-label") === text)!;
const render = async () => { await act(async () => root.render(<SanguoYanYiGame onBack={vi.fn()} />)); };
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
describe("Yan Yi English play screen", () => {
  it("offers the PDF and SRT, seven named sprites per faction and the separate legacy game", async () => {
    await render(); expect(container.querySelector('a[href$=".pdf"]')).not.toBeNull(); expect(container.querySelector('a[href$=".srt"]')).not.toBeNull(); expect(container.querySelector('a[href*="rules=legacy"]')).not.toBeNull();
    await click(button("Pieces")); expect(container.querySelectorAll(".yy-gallery-team a")).toHaveLength(21); expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
  });
  it("opens at 53 calibrated intersections, moves a selected piece, updates the turn, saves and undoes", async () => {
    await render(); await click(button("Begin the campaign")); expect(container.querySelectorAll(".yy-piece")).toHaveLength(53);
    const initial = createYanYiState(); for (const p of initial.pieces) {
      const token = container.querySelector(`button[aria-label^="${p.origin} ${p.role === "emperor" ? "Emperor" : p.role[0].toUpperCase() + p.role.slice(1)},"]`) as HTMLButtonElement;
      expect(token).not.toBeNull();
    }
    const soldier = [...container.querySelectorAll(".yy-piece")].find(b => b.getAttribute("aria-label")?.startsWith("green Soldier") && (b as HTMLButtonElement).style.top === `${YAN_YI_Y[4] / 15.36}%`)!;
    expect((soldier as HTMLButtonElement).style.left).toBe(`${YAN_YI_X[13] / 15.36}%`); await click(soldier); expect(container.querySelectorAll(".yy-node.legal").length).toBeGreaterThan(0);
    await click(container.querySelector(".yy-node.legal")!); expect(container.querySelector(".yy-match-status")?.textContent).toContain("Wei / Pengu Order to move");
    expect(JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state.ply).toBe(1);
    await click(button("Undo")); expect(container.querySelector(".yy-match-status")?.textContent).toContain("Wu / Abster Tribe to move"); expect(JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state.ply).toBe(0);
  });
  it("inspects an opponent with no actionable destinations and opens the actual Free Play rules", async () => {
    await render(); await click(button("Begin the campaign")); await click(container.querySelector('button[aria-label^="blue Horse,"]')!); expect(container.querySelectorAll(".yy-node.legal")).toHaveLength(0);
    await click(button("Rules")); expect(container.querySelector(".yy-manual")?.textContent).toContain("225 playable points"); await click(button("3. Check and turn order")); expect(container.querySelector(".yy-manual")?.textContent).toContain("flying-General restriction does not apply");
  });
  it("resignation keeps the entire inactive army on the board and requires draw consent", async () => {
    await render(); await click(button("Begin the campaign")); await click(button("Resign")); const confirm = [...container.querySelectorAll("dialog button")].find(b => b.textContent === "Resign")!; await click(confirm);
    expect(container.querySelectorAll(".yy-piece")).toHaveLength(53); expect(container.querySelectorAll(".yy-piece.inactive")).toHaveLength(16); expect(container.textContent).toContain("RESIGNED");
    await click(button("Agree draw")); const draw = button("Confirm draw") as HTMLButtonElement; expect(draw.disabled).toBe(true);
    await act(async () => { for (const box of container.querySelectorAll('dialog input[type="checkbox"]')) (box as HTMLInputElement).click(); }); expect(draw.disabled).toBe(false); await click(draw); expect(container.querySelector(".yy-match-status")?.textContent).toContain("Campaign drawn");
  });
  it("resumes the same saved match, including chosen rules and all 53 pieces", async () => {
    const state = createYanYiState({ checkLimit: 9, balanceHan: true }); localStorage.setItem("arctic-sanguo-yan-yi-v1", JSON.stringify({ state, humans: ["green", "blue", "red"], difficulty: "medium" }));
    await render(); await click(button("Resume saved campaign")); expect(container.querySelectorAll(".yy-piece")).toHaveLength(53); expect(JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state.options.checkLimit).toBe(9);
  });
});
