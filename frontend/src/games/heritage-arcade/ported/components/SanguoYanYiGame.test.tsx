// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import SanguoYanYiGame from "./SanguoYanYiGame";
import { createYanYiState, YAN_YI_COLORS, YAN_YI_FACTIONS } from "../game/sanguoYanYiRules";
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
  it.each(YAN_YI_FACTIONS)("%s captures an opponent by tapping its image and keeps the attacking piece", async owner => {
    const enemy = YAN_YI_FACTIONS.find(f => f !== owner)!;
    const initial = createYanYiState();
    const attacker = { id: "attacker", origin: owner, owner, role: "chariot" as const, x: 7, y: 7 };
    const victim = { id: "victim", origin: enemy, owner: enemy, role: "horse" as const, x: 7, y: 9 };
    const state = { ...initial, pieces: [...initial.pieces.filter(p => p.role === "king"), attacker, victim], turn: owner, ply: 6, opening: { blue: true, green: true, red: true } };
    localStorage.setItem("arctic-sanguo-yan-yi-v1", JSON.stringify({ state, humans: [...YAN_YI_FACTIONS], difficulty: "medium" }));
    await render(); await click(button("Resume saved campaign"));
    await click(container.querySelector(`.yy-piece[aria-label^="${owner} Chariot,"] img`)!);
    const target = container.querySelector(`.yy-piece[aria-label^="${enemy} Horse,"]`)!;
    expect(target.classList.contains("capture-target")).toBe(true);
    await click(target.querySelector("img")!);
    const next = JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state;
    expect(next.pieces.find((p: any) => p.id === attacker.id)).toEqual({ ...attacker, x: 7, y: 9 });
    expect(next.pieces.some((p: any) => p.id === victim.id)).toBe(false);
    expect(container.querySelectorAll(".yy-piece")).toHaveLength(4);
    expect(next.events.at(-1)).toMatchObject({ actor: owner, capture: "horse" });
    expect(container.querySelector(`.yy-piece[aria-label^="${owner} Chariot,"]`)).not.toBeNull();
  });
  it("red's Horse survives taking Han and its yellow Chariot captures a blue opponent", async () => {
    const initial = createYanYiState();
    const horse = { id: "red-horse", origin: "red" as const, owner: "red" as const, role: "horse" as const, x: 2, y: 7 };
    const victim = { id: "blue-target", origin: "blue" as const, owner: "blue" as const, role: "soldier" as const, x: 6, y: 6 };
    const state = { ...initial, pieces: [...initial.pieces.filter(p => p.role === "king" || p.origin === "han"), horse, victim], turn: "red" as const, ply: 6, opening: { blue: true, green: true, red: true } };
    localStorage.setItem("arctic-sanguo-yan-yi-v1", JSON.stringify({ state, humans: [...YAN_YI_FACTIONS], difficulty: "medium" }));
    await render(); await click(button("Resume saved campaign"));
    await click(container.querySelector('.yy-piece[aria-label^="red Horse,"] img')!);
    const emperor = container.querySelector('.yy-piece[aria-label^="han Emperor,"]')!;
    expect(emperor.classList.contains("capture-target")).toBe(true);
    expect(emperor.querySelector("img")?.getAttribute("src")).toMatch(/\/han-emperor\.webp$/);
    await click(emperor.querySelector("img")!);
    let next = JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state;
    expect(next.pieces.find((p: any) => p.id === horse.id)).toEqual({ ...horse, x: 0, y: 8 });
    expect(next.hanOwner).toBe("red"); expect(next.alliance).toEqual(["green", "blue"]);
    // Play the two allied kingdoms' quiet King replies, then capture on red's next turn.
    const playKing = async (owner: string) => { await click(container.querySelector(`.yy-piece[aria-label^="${owner} King,"]`)!); await click(container.querySelector(".yy-node.legal")!); };
    await playKing("green"); await playKing("blue");
    expect(JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state.turn).toBe("red");
    const chariot = [...container.querySelectorAll(".yy-piece")].find(b => b.getAttribute("aria-label")?.startsWith("han Chariot,") && (b as HTMLButtonElement).style.top === `${YAN_YI_Y[6] / 15.36}%`)!;
    expect(chariot.querySelector("img")?.getAttribute("src")).toMatch(/\/han-chariot-imperial\.webp$/);
    await click(chariot.querySelector("img")!);
    const target = container.querySelector('.yy-piece[aria-label^="blue Soldier,"]')!;
    expect(target.classList.contains("capture-target")).toBe(true); await click(target.querySelector("img")!);
    next = JSON.parse(localStorage.getItem("arctic-sanguo-yan-yi-v1")!).state;
    expect(next.pieces.find((p: any) => p.id === "han-chariot-6")).toMatchObject({ owner: "red", origin: "han", role: "chariot", x: 6, y: 6 });
    expect(next.pieces.some((p: any) => p.id === victim.id)).toBe(false);
    expect(next.events.at(-1)).toMatchObject({ actor: "red", pieceId: "han-chariot-6", capture: "soldier" });
    expect(container.querySelector('.yy-piece[aria-label^="han Chariot,"] img')?.getAttribute("src")).toMatch(/\/han-chariot-imperial\.webp$/);
  });
  it("offers the PDF and SRT, seven sprites per faction, four named Han downloads and the separate legacy game", async () => {
    await render(); expect(container.querySelector('a[href$=".pdf"]')).not.toBeNull(); expect(container.querySelector('a[href$=".srt"]')).not.toBeNull(); expect(container.querySelector('a[href*="rules=legacy"]')).not.toBeNull();
    await click(button("Pieces")); expect(container.querySelectorAll(".yy-gallery-team:not(.yy-gallery-han) a")).toHaveLength(21);
    const hanDownloads = [...container.querySelectorAll(".yy-gallery-han a")];
    expect(hanDownloads).toHaveLength(4);
    expect(hanDownloads.map(a => a.getAttribute("download"))).toEqual(["han-emperor.webp", "han-chariot-imperial.webp", "han-chariot-vanguard.webp", "han-cannon.webp"]);
    expect(hanDownloads.map(a => a.querySelector("b")?.textContent)).toEqual(["Han Golden Emperor", "Han Imperial Chariot", "Han Vanguard Chariot", "Han Golden Cannon"]);
    expect(container.querySelectorAll(".yy-gallery-team a")).toHaveLength(25); expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
  });
  it("renders the Emperor, three Chariots and Cannon using four yellow Han images", async () => {
    await render(); await click(button("Begin the campaign"));
    const tokens = [...container.querySelectorAll('.yy-piece[aria-label^="han "]')];
    expect(tokens).toHaveLength(5);
    const sources = tokens.map(b => b.querySelector("img")?.getAttribute("src")?.split("/").at(-1));
    expect(sources.filter(s => s === "han-chariot-imperial.webp")).toHaveLength(2);
    expect(new Set(sources)).toEqual(new Set(["han-emperor.webp", "han-chariot-imperial.webp", "han-chariot-vanguard.webp", "han-cannon.webp"]));
    expect(container.querySelectorAll(".yy-neutral-token")).toHaveLength(0);
    await click(tokens.find(b => b.getAttribute("aria-label")?.startsWith("han Emperor,"))!);
    expect(container.querySelector(".yy-inspector h3")?.textContent).toBe("Han Golden Emperor");
    expect(container.querySelector(".yy-inspector-piece img")?.getAttribute("src")).toMatch(/\/han-emperor\.webp$/);
  });
  it.each(YAN_YI_FACTIONS)("keeps a moved Han Vanguard Chariot yellow when a saved campaign is controlled by %s", async owner => {
    const initial = createYanYiState();
    const state = { ...initial, pieces: initial.pieces.filter(p => p.role !== "emperor").map(p => p.origin === "han" ? { ...p, owner, ...(p.id === "han-chariot-8" ? { x: 7, y: 6 } : {}) } : p), hanOwner: owner, activationUsed: true, turn: owner, ply: 6, opening: { blue: true, green: true, red: true } };
    localStorage.setItem("arctic-sanguo-yan-yi-v1", JSON.stringify({ state, humans: [...YAN_YI_FACTIONS], difficulty: "medium" }));
    await render(); await click(button("Resume saved campaign"));
    const token = [...container.querySelectorAll('.yy-piece[aria-label^="han Chariot,"]')].find(b => (b as HTMLButtonElement).style.left === `${YAN_YI_X[7] / 15.36}%`)!;
    expect(token.querySelector("img")?.getAttribute("src")).toMatch(/\/han-chariot-vanguard\.webp$/);
    expect((token as HTMLButtonElement).style.getPropertyValue("--piece-color")).toBe(YAN_YI_COLORS[owner]);
    expect(token.querySelector(".yy-owner-tag")?.textContent).toBe(owner === "blue" ? "WEI" : owner === "green" ? "WU" : "SHU");
    await click(token.querySelector("img")!);
    expect(container.querySelector(".yy-inspector h3")?.textContent).toBe("Han Vanguard Chariot");
    expect(container.querySelector(".yy-inspector-piece img")?.getAttribute("src")).toMatch(/\/han-chariot-vanguard\.webp$/);
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
