// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SanguoBoard from "./SanguoBoard";
import { initialSanguoState, legalSanguoTargets, sanguoStateFrom, type SanguoState, type SanguoPiece } from "../game/sanguoRules";
import { arcticBoardNode } from "../game/sanguoArcticBoardGraph";
vi.mock("../../../../utils/soundManager.js", () => ({ soundManager: { isEnabled: () => false, subscribe: () => () => {}, play: vi.fn(), unlock: vi.fn(), toggleMuted: vi.fn() } }));
vi.mock("@/components/SanguoManual", () => ({ default: () => <div>Full manual</div> }));

let container: HTMLDivElement, root: Root;
let compact = false;
const onMove = vi.fn();
const props = (state = initialSanguoState()) => ({ state, onBack: vi.fn(), bannermenEnabled: false, canAct: true, onMove, onResolve: vi.fn(), onUndo: vi.fn(), onNewGame: vi.fn(), canUndo: true, online: false, seatLabels: { red: "You", green: "Medium bot", blue: "Medium bot" }, notice: "Red to move", events: [], partialHistory: false });
const render = async (extra: Partial<ReturnType<typeof props>> = {}) => { await act(async () => root.render(<div className="sg-experience sg-match"><SanguoBoard {...props()} {...extra} /></div>)); };
const click = async (element: Element) => { await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); };
const button = (label: string) => [...container.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === label || b.textContent === label)!;
const piece = (id: string) => container.querySelector(`[data-piece-id="${id}"]`)!;
const pointer = async (element: Element, type: string, x: number, y: number, pointerId = 1, pointerType = "mouse") => {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: pointerType } });
  await act(async () => element.dispatchEvent(event));
};
beforeEach(() => {
  compact = false; onMove.mockClear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: compact, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  // Unit tests model a fitted SVG coordinate space; real browser layout remains a visual QA step.
  (SVGSVGElement.prototype as any).getScreenCTM = () => ({ inverse: () => ({}) });
  (globalThis as any).DOMPoint = class { constructor(public x: number, public y: number) {} matrixTransform() { return this; } };
  SVGElement.prototype.setPointerCapture = vi.fn(); SVGElement.prototype.hasPointerCapture = () => false; SVGElement.prototype.releasePointerCapture = vi.fn();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

describe("Sanguo match interactions", () => {
  it("keeps all opening pieces at approved coordinates and activates legal click targets", async () => {
    const state = initialSanguoState(); await render({ state });
    expect(container.querySelectorAll("[data-piece-id]")).toHaveLength(48);
    for (const p of state.pieces) {
      const node = arcticBoardNode(p.node.sector, p.node.rank, p.node.file);
      expect((piece(p.id) as SVGElement).style.transform).toBe(`translate(${node.x * 1280}px, ${node.y * 1124}px)`);
    }
    await click(piece("red-scout-0"));
    const targets = container.querySelectorAll(".arctic-node-hitbox.active"); expect(targets.length).toBeGreaterThan(0);
    await click(targets[0]);
    expect(onMove).toHaveBeenCalledWith("red-scout-0", legalSanguoTargets(state.pieces.find(p => p.id === "red-scout-0")!, state.pieces)[0]);
  });
  it("does not clear a selection when an unchanged online position is polled", async () => {
    const state = initialSanguoState(); await render({ state }); await click(piece("red-scout-0"));
    await render({ state: structuredClone(state) });
    expect(piece("red-scout-0").classList.contains("selected")).toBe(true);
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(piece("red-scout-0").classList.contains("selected")).toBe(false);
  });
  it("inspects another kingdom without making its pieces actionable", async () => {
    await render(); await click(piece("green-scout-0"));
    expect(container.querySelector(".sg-inspector-title img")?.getAttribute("src")).toContain("token-sanguo-green-soldier");
    expect(container.querySelectorAll(".arctic-node-hitbox.active")).toHaveLength(0);
    expect(onMove).not.toHaveBeenCalled();
  });
  it("distinguishes an enemy capture target and submits the capture", async () => {
    const state = initialSanguoState();
    const red = state.pieces.find(p => p.id === "red-scout-0")!;
    const victim = state.pieces.find(p => p.id === "green-scout-0")!;
    victim.node = legalSanguoTargets(red, state.pieces)[0];
    await render({ state }); await click(piece(red.id));
    expect(piece(victim.id).classList.contains("sg-capture-target")).toBe(true);
    expect(piece(victim.id).querySelector(".sg-capture-brackets")).not.toBeNull();
    await click(piece(victim.id));
    expect(onMove).toHaveBeenCalledWith(red.id, victim.node);
  });
  it("displays an explicit General warning for an engine-checked position", async () => {
    const pieces: SanguoPiece[] = [
      { id: "rk", sector: "red", controller: "red", role: "king", node: { sector: "red", rank: 4, file: 4 } },
      { id: "gk", sector: "green", controller: "green", role: "king", node: { sector: "green", rank: 4, file: 3 } },
      { id: "bk", sector: "blue", controller: "blue", role: "king", node: { sector: "blue", rank: 4, file: 3 } },
      { id: "attacker", sector: "green", controller: "green", role: "icebreaker", node: { sector: "red", rank: 2, file: 4 } },
    ];
    await render({ state: sanguoStateFrom(pieces) });
    expect(piece("rk").querySelector(".sg-check-symbol")).not.toBeNull();
    expect(container.querySelector(".sg-table-turn")?.textContent).toContain("in check");
  });
  it("snaps a legal drag and cancels a distant or out-of-turn drop", async () => {
    const state = initialSanguoState(); await render({ state });
    const red = state.pieces.find(p => p.id === "red-scout-0")!, target = legalSanguoTargets(red, state.pieces)[0];
    const from = arcticBoardNode(red.node.sector, red.node.rank, red.node.file), to = arcticBoardNode(target.sector, target.rank, target.file);
    const svg = container.querySelector("svg.arctic-board")!;
    await pointer(piece(red.id), "pointerdown", from.x * 1280, from.y * 1124);
    await pointer(svg, "pointermove", to.x * 1280, to.y * 1124);
    await pointer(svg, "pointerup", to.x * 1280, to.y * 1124);
    expect(onMove).toHaveBeenCalledWith(red.id, target); onMove.mockClear();
    await pointer(piece(red.id), "pointerdown", from.x * 1280, from.y * 1124);
    await pointer(svg, "pointermove", 0, 0); await pointer(svg, "pointerup", 0, 0);
    expect(onMove).not.toHaveBeenCalled(); expect(container.textContent).toContain("Move cancelled");
    await render({ state, canAct: false });
    await pointer(piece(red.id), "pointerdown", from.x * 1280, from.y * 1124);
    await pointer(svg, "pointermove", to.x * 1280, to.y * 1124); await pointer(svg, "pointerup", to.x * 1280, to.y * 1124);
    expect(onMove).not.toHaveBeenCalled();
  });
  it("zooms and restores the exact viewBox, with a reversible focus panel", async () => {
    await render(); await click(button("Zoom in"));
    expect(container.querySelector("svg.arctic-board")?.getAttribute("viewBox")).not.toBe("0 0 1280 1124");
    await click(button("Fit board")); expect(container.querySelector("svg.arctic-board")?.getAttribute("viewBox")).toBe("0 0 1280 1124");
    await click(button("Focus view")); expect(container.querySelector(".sg-match-panel")?.hasAttribute("hidden")).toBe(true);
    await click(button("Show match panel")); expect(container.querySelector(".sg-match-panel")?.hasAttribute("hidden")).toBe(false);
  });
  it("only offers army resolution when required and keeps the guide over the board", async () => {
    await render(); expect(button("Resolve army")).toBeUndefined();
    const state = initialSanguoState(); state.pending = { defeated: "green", victor: "red", reason: "stalemate" };
    const onResolve = vi.fn(); await render({ state, onResolve });
    expect(container.querySelector(".sg-table-event")?.textContent).toContain("15 remaining pieces");
    await click(button("Resolve army")); expect(onResolve).toHaveBeenCalledOnce();
    await click(button("Guide")); expect(container.querySelector(".sg-guide-dialog")?.hasAttribute("open")).toBe(true);
    expect(container.querySelectorAll("[data-piece-id]")).toHaveLength(48);
    await click(button("Close guide")); expect(container.querySelector(".sg-guide-dialog")?.hasAttribute("open")).toBe(false);
  });
  it("uses a dismissible match drawer on phones and pinch zoom never submits a move", async () => {
    compact = true; await render();
    expect(container.querySelector(".sg-mobile-drawer")?.hasAttribute("open")).toBe(false);
    await click(button("Open match details")); expect(container.querySelector(".sg-mobile-drawer")?.hasAttribute("open")).toBe(true);
    await click(button("Close match details")); expect(container.querySelector(".sg-mobile-drawer")?.hasAttribute("open")).toBe(false);
    const svg = container.querySelector("svg.arctic-board")!;
    await pointer(svg, "pointerdown", 300, 300, 1, "touch"); await pointer(svg, "pointerdown", 500, 300, 2, "touch");
    await pointer(svg, "pointermove", 700, 300, 2, "touch");
    expect(svg.getAttribute("viewBox")).not.toBe("0 0 1280 1124");
    await pointer(svg, "pointerup", 300, 300, 1, "touch"); await pointer(svg, "pointerup", 700, 300, 2, "touch");
    expect(onMove).not.toHaveBeenCalled();
    await click(button("Fit board")); expect(svg.getAttribute("viewBox")).toBe("0 0 1280 1124");
  });
});
