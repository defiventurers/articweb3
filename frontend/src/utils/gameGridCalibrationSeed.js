const GAME_GRID_STORAGE_KEY = "arcticCalibrationGameGridDesktop";
const GAME_STORAGE_KEY = "arcticCalibrationGameDesktop";

const GAME_GRID_CALIBRATION_ITEMS = [
  { id: "game-board", label: "8x8 Board Square", selector: ".game-stage", kind: "board", left: 29.47, top: 17.53, width: 38.12, height: 38.37, cssVarPrefix: "board" },
  { id: "game-roll", label: "Roll Dice Hitbox", selector: ".roll-hitbox", kind: "button", left: 71.14, top: 48.24, width: 21.12, height: 13.21 },
  { id: "game-main-menu", label: "Main Menu Hitbox", selector: ".new-game-hitbox", kind: "button", left: 38.17, top: 89.31, width: 18.87, height: 9.94 },
  { id: "game-end-turn", label: "End Turn Hitbox", selector: ".end-turn-hitbox", kind: "button", left: 71.07, top: 62.23, width: 21.25, height: 13.45 },
  { id: "game-dice", label: "Dice Overlay Area", selector: ".dice-overlay", kind: "card", left: 71.66, top: 34.92, width: 21.11, height: 11.63 },
  { id: "game-status", label: "Turn / Status Text", selector: ".game-status-overlay", kind: "text", left: 29.45, top: 6.11, width: 29.04, height: 5.3, fontSize: "1.1cqh" },
  { id: "game-room-badge", label: "Room Badge", selector: ".game-status-badge", kind: "text", left: 58.78, top: 6.79, width: 7.15, height: 4.06, fontSize: "1.0cqh", extraCss: ["position: absolute;"] }
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
