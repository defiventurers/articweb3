const GAME_GRID_STORAGE_KEY = "arcticCalibrationGameGridDesktop";
const GAME_STORAGE_KEY = "arcticCalibrationGameDesktop";

const GAME_GRID_CALIBRATION_ITEMS = [
  { id: "game-board", label: "8x8 Board Square", selector: ".game-stage", kind: "board", left: 29.9, top: 17.66, width: 38.55, height: 37.48, cssVarPrefix: "board" },
  { id: "game-roll", label: "Roll Dice Hitbox", selector: ".roll-hitbox", kind: "button", left: 71.14, top: 52.2, width: 21.05, height: 13.72 },
  { id: "game-main-menu", label: "Main Menu Hitbox", selector: ".new-game-hitbox", kind: "button", left: 13.66, top: 59.54, width: 12.4, height: 8.79 },
  { id: "game-end-turn", label: "End Turn Hitbox", selector: ".end-turn-hitbox", kind: "button", left: 71.07, top: 66.19, width: 21.25, height: 13.96 },
  { id: "game-dice", label: "Dice Overlay Area", selector: ".dice-overlay", kind: "card", left: 71.88, top: 37.99, width: 20.75, height: 14.06 },
  { id: "game-status", label: "Turn / Status Text", selector: ".game-status-overlay", kind: "text", left: 29.38, top: 5.6, width: 38.38, height: 7.09, fontSize: "1.35cqh" },
  { id: "game-room-badge", label: "Room Badge", selector: ".game-status-badge", kind: "text", left: 69.92, top: 9.35, width: 4.63, height: 3.93, fontSize: "1.2cqh", extraCss: ["position: absolute;"] }
];

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("calibrate") === "game-grid" || params.get("calibrate") === "game") {
    try {
      const key = params.get("calibrate") === "game-grid" ? GAME_GRID_STORAGE_KEY : GAME_STORAGE_KEY;
      window.localStorage.setItem(key, JSON.stringify(GAME_GRID_CALIBRATION_ITEMS));
    } catch {}
  }
}
