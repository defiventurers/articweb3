import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { Web3Provider } from "./providers/Web3Provider.jsx";
import "./styles/global.css";
import "./styles/lobbyModes.css";
import "./styles/highStakes.css";
import "./styles/gameBoard.css";
import "./styles/teamSelect.css";
import "./styles/howToPlay.css";
import "./styles/howToPlayMobile.css";
import "./styles/tutorialBoard.css";
import "./styles/promotionBoard.css";
import "./styles/startingPositions.css";
import "./styles/profileScreen.css";
import "./styles/openIceFlow.css";
import "./styles/calibration.css";
import "./styles/calibratedOverrides.css";
import "./utils/highstakesCalibrationExport.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
);
