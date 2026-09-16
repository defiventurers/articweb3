// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SanninShogiApp, { SanninBoard } from "./SanninShogiApp.jsx";
import { createInitialState, getLegalActions } from "./rules.js";

describe("SanninShogiApp", () => {
  it("renders a local three-seat setup with the heritage identity", () => {
    const html = renderToStaticMarkup(<SanninShogiApp />);
    expect(html).toContain("Sannin Shogi");
    expect(html).toContain("Three Homes, One Pleasure Garden");
    expect(html).toContain("Begin match");
    expect(html).toContain("Opening pact");
  });

  it("renders exactly 127 semantic gridcells with a single roving tab stop", () => {
    const state = createInitialState();
    const html = renderToStaticMarkup(<SanninBoard state={state} selected={null} legalActions={getLegalActions(state)} onCell={() => {}} onCancel={() => {}} zoom={100} />);
    expect((html.match(/role="gridcell"/g) || [])).toHaveLength(127);
    expect((html.match(/tabindex="0"/g) || [])).toHaveLength(1);
    expect(html).toContain("Pleasure Garden");
    expect(html).toContain("Use arrow keys");
  });

  it("focus-traps the rule scroll, closes with Escape, and restores focus", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<SanninShogiApp />));
    const opener = [...host.querySelectorAll("button")].find((button) => button.textContent === "Open rule scroll");
    opener.focus();
    await act(async () => opener.click());
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close rulebook");
    const buttons = [...dialog.querySelectorAll("button")];
    buttons.at(-1).focus();
    await act(async () => buttons.at(-1).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
    expect(document.activeElement).toBe(buttons[0]);
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    await act(async () => root.unmount());
    host.remove();
  });

  it("completes a King selection and landing without castle/promotion ambiguity", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.requestAnimationFrame = (callback) => callback();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<SanninShogiApp />));
    await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === "Begin match").click());
    const kingCell = [...host.querySelectorAll('[role="gridcell"]')].find((cell) => cell.getAttribute("aria-label").includes("6,-3") && cell.getAttribute("aria-label").includes("First King"));
    await act(async () => kingCell.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const destination = [...host.querySelectorAll('[role="gridcell"]')].find((cell) => cell.getAttribute("aria-label").includes("legal destination"));
    expect(destination).toBeTruthy();
    await act(async () => destination.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(host.textContent).toContain("Middle to move");
    expect(host.querySelector('[aria-labelledby="promotion-title"]')).toBeNull();
    await act(async () => root.unmount());
    host.remove();
  }, 10000);
});
