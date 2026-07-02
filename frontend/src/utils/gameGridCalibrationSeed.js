const GAME_GRID_STORAGE_KEY = "arcticCalibrationGameGridDesktop";
const GAME_STORAGE_KEY = "arcticCalibrationGameDesktop";
const STAGE_RATIO = 16 / 9;

const boardWidth = 40.83;
const boardHeightForSquarePixels = Number((boardWidth * STAGE_RATIO).toFixed(2));

const GAME_GRID_CALIBRATION_ITEMS = [
  { id: "game-board", label: "8x8 Board Square", selector: ".game-stage", kind: "board", left: 31.6, top: 23.5, width: boardWidth, height: boardHeightForSquarePixels, cssVarPrefix: "board" },
  { id: "game-roll", label: "Roll Dice Hitbox", selector: ".roll-hitbox", kind: "button", left: 23.26, top: 91.1, width: 14.7, height: 7.67 },
  { id: "game-main-menu", label: "Main Menu Hitbox", selector: ".new-game-hitbox", kind: "button", left: 41.8, top: 92.67, width: 16.6, height: 6.26 },
  { id: "game-end-turn", label: "End Turn Hitbox", selector: ".end-turn-hitbox", kind: "button", left: 61.5, top: 92.0, width: 15.6, height: 5.6 },
  { id: "game-dice", label: "Dice Overlay Area", selector: ".dice-overlay", kind: "card", left: 37.6, top: 83.36, width: 25.02, height: 8.05 },
  { id: "game-status", label: "Turn / Status Text", selector: ".game-status-overlay", kind: "text", left: 31.77, top: 14.1, width: 29.04, height: 5.3, fontSize: "1.1cqh" },
  { id: "game-room-badge", label: "Room Badge", selector: ".game-status-badge", kind: "text", left: 61.3, top: 14.9, width: 7.15, height: 4.06, fontSize: "1.0cqh", extraCss: ["position: absolute;"] }
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
