import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { NetworkBadge } from "./components/NetworkBadge.jsx";
import { Web3Provider } from "./providers/Web3Provider.jsx";
import "./styles/global.css";
import "./styles/frostLoading.css";
import "./styles/lobbyModes.css";
import "./styles/highStakes.css";
import "./styles/networkAndConfig.css";
import "./styles/walletStatus.css";
import "./styles/gameBoard.css";
import "./styles/diceFaces.css";
import "./styles/teamSelect.css";
import "./styles/howToPlay.css";
import "./styles/howToPlayMobile.css";
import "./styles/tutorialBoard.css";
import "./styles/promotionBoard.css";
import "./styles/startingPositions.css";
import "./styles/profileScreen.css";
import "./styles/openIceFlow.css";
import "./styles/dataScreens.css";
import "./styles/dataScreensPolish.css";
import "./styles/calibration.css";
import "./styles/calibrationBoardSquareFix.css";
import "./styles/calibratedOverrides.css";
import "./styles/desktopCalibrationFixes.css";
import "./utils/gameGridCalibrationSeed.js";
import "./utils/playerHubCalibrationSeed.js";
import "./utils/highstakesCalibrationExport.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Web3Provider>
      <NetworkBadge />
      <App />
    </Web3Provider>
  </React.StrictMode>
);
