const PLAYER_HUB_STORAGE_KEY = "arcticCalibrationPlayerHubDesktop";

const PLAYER_HUB_DESKTOP_CALIBRATION_ITEMS = [
  { id: "hub-open-ice", label: "Open Ice", selector: ".open-ice-hitbox", kind: "button", left: 38.56, top: 27.01, width: 24.43, height: 29.12 },
  { id: "hub-high-stakes", label: "High Stakes", selector: ".high-stakes-hitbox", kind: "button", left: 38.47, top: 57.36, width: 23.97, height: 26.15 },
  { id: "hub-match-history", label: "Match History", selector: ".match-history-hitbox", kind: "button", left: 12.83, top: 36.97, width: 11.47, height: 21.48 },
  { id: "hub-leaderboard", label: "Leaderboard", selector: ".leaderboard-hitbox", kind: "button", left: 24.3, top: 37.3, width: 11.93, height: 20.16 },
  { id: "hub-account-activity", label: "Account Activity", selector: ".account-activity-hitbox", kind: "button", left: 12.83, top: 58.6, width: 11.56, height: 19.99 },
  { id: "hub-my-rooms", label: "My Rooms", selector: ".my-rooms-hitbox", kind: "button", left: 24.77, top: 58.6, width: 11.09, height: 20.32 },
  { id: "hub-wallet-value", label: "Wallet Value", selector: ".wallet-value", kind: "text", left: 77.24, top: 41.44, width: 13.28, height: 4.99, fontSize: "1.8cqh", extraCss: ["display: grid;"] },
  { id: "hub-available-value", label: "Available Value", selector: ".available-value", kind: "text", left: 77.06, top: 47.33, width: 13.65, height: 5.32, fontSize: "1.8cqh", extraCss: ["display: grid;"] },
  { id: "hub-locked-value", label: "Locked Value", selector: ".locked-value", kind: "text", left: 77.13, top: 53.01, width: 13.67, height: 5.11, fontSize: "1.8cqh", extraCss: ["display: grid;"] },
  { id: "hub-amount", label: "Amount Input", selector: ".playerhub-amount-input", kind: "input", left: 72.48, top: 60.28, width: 18.4, height: 4.8, fontSize: "1.8cqh", extraCss: ["display: block;"] },
  { id: "hub-refresh", label: "Refresh", selector: ".refresh-hitbox", kind: "button", left: 65.09, top: 67.02, width: 8.12, height: 7.59 },
  { id: "hub-deposit", label: "Deposit", selector: ".deposit-hitbox", kind: "button", left: 73.64, top: 67.19, width: 8.4, height: 7.1 },
  { id: "hub-withdraw", label: "Withdraw", selector: ".withdraw-hitbox", kind: "button", left: 82.93, top: 67.35, width: 8.4, height: 6.6 },
  { id: "hub-back", label: "Back", selector: ".playerhub-back-hitbox", kind: "button", left: 37.91, top: 83.69, width: 24.17, height: 10.95 }
];

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("calibrate") === "player-hub") {
    try {
      window.localStorage.setItem(PLAYER_HUB_STORAGE_KEY, JSON.stringify(PLAYER_HUB_DESKTOP_CALIBRATION_ITEMS));
    } catch {}
  }
}
