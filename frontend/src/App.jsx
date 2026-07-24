import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  FrostLoadingScreen,
  FrostRouteLoader,
  warmGameAssets,
  warmHowToPlayAssets
} from "./components/FrostLoadingScreen.jsx";
import { AudioToggle } from "./components/AudioToggle.jsx";
import { CoverScreen } from "./screens/CoverScreen.jsx";
import { GameLibraryScreen } from "./screens/GameLibraryScreen.jsx";
import { GamePreviewScreen } from "./screens/GamePreviewScreen.jsx";
import { MainMenu } from "./screens/MainMenu.jsx";
import { NineIceFortsApp } from "./games/nine-ice-forts/NineIceFortsApp.jsx";
import { FourWingIceHuntApp } from "./games/four-wing-ice-hunt/FourWingIceHuntApp.jsx";
import { FishflowApp } from "./games/fishflow/FishflowApp.jsx";
import { BreakTheIceApp } from "./games/break-the-ice/BreakTheIceApp.jsx";
import { IceHuntersApp } from "./games/ice-hunters/IceHuntersApp.jsx";
import { getCatalogGame } from "./data/gameCatalog.js";
import { HighStakesGate } from "./features/high-stakes/HighStakesGate.jsx";
import { soundManager } from "./utils/soundManager.js";
import { initUiHoverFeedback, unlockUiAudio } from "./utils/uiHoverSound.js";
import "./styles/mobileProof.css";
import "./utils/preferWebpAssets.js";

const CalibrationScreen = lazyNamed(() => import("./screens/CalibrationScreen.jsx"), "CalibrationScreen");
const DesktopMainMenuCalibration = lazyNamed(() => import("./screens/DesktopMainMenuCalibration.jsx"), "DesktopMainMenuCalibration");
const MobileProfileCalibration = lazyNamed(() => import("./screens/MobileProfileCalibration.jsx"), "MobileProfileCalibration");
const HowToPlayScreen = lazyNamed(() => import("./screens/HowToPlayScreen.jsx"), "HowToPlayScreen");
const ProfileScreen = lazyNamed(() => import("./screens/ProfileScreen.jsx"), "ProfileScreen");
const PlayerHubScreen = lazyNamed(() => import("./screens/PlayerHubScreen.jsx"), "PlayerHubScreen");
const OpenIceMenuScreen = lazyNamed(() => import("./screens/OpenIceMenuScreen.jsx"), "OpenIceMenuScreen");
const CreateRoomScreen = lazyNamed(() => import("./screens/CreateRoomScreen.jsx"), "CreateRoomScreen");
const JoinRoomScreen = lazyNamed(() => import("./screens/JoinRoomScreen.jsx"), "JoinRoomScreen");
const TeamSelectScreen = lazyNamed(() => import("./screens/TeamSelectScreen.jsx"), "TeamSelectScreen");
const HighStakesScreen = lazyNamed(() => import("./screens/HighStakesScreen.jsx"), "HighStakesScreen");
const WaitingRoomScreen = lazyNamed(() => import("./screens/WaitingRoomScreen.jsx"), "WaitingRoomScreen");
const GameScreen = lazyNamed(() => import("./screens/GameScreen.jsx"), "GameScreen");
const ResultsScreen = lazyNamed(() => import("./screens/ResultsScreen.jsx"), "ResultsScreen");
const EthVaultDeployerScreen = lazyNamed(() => import("./screens/EthVaultDeployerScreen.jsx"), "EthVaultDeployerScreen");
const SettlementAdminScreen = lazyNamed(() => import("./screens/SettlementAdminScreen.jsx"), "SettlementAdminScreen");
const MatchHistoryScreen = lazyNamed(() => import("./screens/MatchHistoryScreen.jsx"), "MatchHistoryScreen");
const LeaderboardScreen = lazyNamed(() => import("./screens/LeaderboardScreen.jsx"), "LeaderboardScreen");
const MyRoomsScreen = lazyNamed(() => import("./screens/MyRoomsScreen.jsx"), "MyRoomsScreen");
const AccountActivityScreen = lazyNamed(() => import("./screens/AccountActivityScreen.jsx"), "AccountActivityScreen");
const SpectatorScreen = lazyNamed(() => import("./screens/SpectatorScreen.jsx"), "SpectatorScreen");
const DevQAScreen = lazyNamed(() => import("./screens/DevQAScreen.jsx"), "DevQAScreen");
const TestRunbookScreen = lazyNamed(() => import("./screens/TestRunbookScreen.jsx"), "TestRunbookScreen");
const DevPortalScreen = lazyNamed(() => import("./screens/DevPortalScreen.jsx"), "DevPortalScreen");

const SMOKE_PROFILE = { wallet: "0x0000000000000000000000000000000000000019", name: "Smoke Penguin", points: 0 };
const COVER_TRACK_DELAY_MS = 650;
const PLAY_NOW_TRACK_DELAY_MS = 500;

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const calibrationTarget = params.get("calibrate");
  const isDevPath = /^\/dev\/?$/.test(window.location.pathname);
  const smokeProfileEnabled = import.meta.env.DEV && params.get("smokeProfile") === "1";
  const skipLoader = params.get("skipLoader") === "1" || Boolean(calibrationTarget) || smokeProfileEnabled || isDevPath;
  const initialSpectateCode = params.get("spectate") || "";
  const initialHighStakesRoomCode = cleanInviteCode(params.get("highStakesRoom") || params.get("hsRoom") || params.get("lockedRoom") || "");
  const requestedGame = getCatalogGame(params.get("game"));
  const initialSelectedGameId = requestedGame?.id || (initialHighStakesRoomCode ? "arctic-dominion" : null);
  const initialScreen = isDevPath
    ? "dev-home"
    : initialSpectateCode
      ? "spectator"
      : smokeProfileEnabled && initialHighStakesRoomCode
        ? "high-stakes"
        : smokeProfileEnabled
          ? "hub"
          : initialHighStakesRoomCode
            ? "cover"
            : requestedGame?.id === "nine-ice-forts"
              ? "nine-ice-forts"
              : requestedGame?.id === "four-wing-ice-hunt"
                ? "four-wing-ice-hunt"
                : requestedGame?.id === "fishflow"
                  ? "fishflow"
                  : requestedGame?.id === "break-the-ice"
                    ? "break-the-ice"
                    : requestedGame?.id === "ice-hunters"
                      ? "ice-hunters"
                      : requestedGame?.available
                        ? "cover"
                        : requestedGame
                          ? "game-preview"
                          : "library";
  const [assetsReady, setAssetsReady] = useState(skipLoader);
  const [screen, setScreen] = useState(initialScreen);
  const [selectedGameId, setSelectedGameId] = useState(initialSelectedGameId);
  const [profile, setProfile] = useState(smokeProfileEnabled ? SMOKE_PROFILE : null);
  const [room, setRoom] = useState(null);
  const transitionTimerRef = useRef(null);
  const selectedGame = getCatalogGame(selectedGameId);

  useEffect(() => { soundManager.load(); unlockUiAudio(); return () => window.clearTimeout(transitionTimerRef.current); }, []);
  useEffect(() => initUiHoverFeedback(), []);
  useEffect(() => { if (assetsReady) soundManager.handleScreen(screen, { room, profile }); }, [assetsReady, screen, room, profile]);

  if (calibrationTarget === "main-menu-desktop") return renderLazy(<DesktopMainMenuCalibration />, "Loading desktop main menu calibration...");
  if (calibrationTarget === "profile-mobile") return renderLazy(<MobileProfileCalibration />, "Loading mobile profile calibration...");
  if (calibrationTarget) return renderLazy(<CalibrationScreen target={calibrationTarget} />, "Loading calibration deck...");
  if (!assetsReady) return <FrostLoadingScreen onReady={() => setAssetsReady(true)} />;

  function roomLobbyScreen(targetRoom = room) {
    return targetRoom?.roomMode === "high_stakes" ? "high-stakes" : "open-ice-menu";
  }

  function goTo(nextScreen, options = {}) {
    window.clearTimeout(transitionTimerRef.current);
    if (options.tapSound !== false) soundManager.play("uiTap", { cooldownMs: 80 });
    if (nextScreen === "how-to-play") warmHowToPlayAssets();
    if (nextScreen === "game" || nextScreen === "team-select" || nextScreen === "waiting") warmGameAssets();
    setScreen(nextScreen);
  }

  function playTrackThenGo(trackName, nextScreen, delayMs) {
    window.clearTimeout(transitionTimerRef.current);
    soundManager.unlock();
    unlockUiAudio();
    soundManager.playTrack(trackName, { restart: true });
    transitionTimerRef.current = window.setTimeout(() => goTo(nextScreen, { tapSound: false }), delayMs);
  }

  function withAppChrome(node) {
    return <><AudioToggle />{node}</>;
  }

  function selectCatalogGame(gameId) {
    const game = getCatalogGame(gameId);
    if (!game) return;
    setSelectedGameId(game.id);
    syncGameQuery(game.id);
    if (game.id === "nine-ice-forts") return goTo("nine-ice-forts");
    if (game.id === "four-wing-ice-hunt") return goTo("four-wing-ice-hunt");
    if (game.id === "fishflow") return goTo("fishflow");
    if (game.id === "break-the-ice") return goTo("break-the-ice");
    if (game.id === "ice-hunters") return goTo("ice-hunters");
    goTo(game.available ? "cover" : "game-preview");
  }

  function exitToLibrary() {
    setSelectedGameId(null);
    syncGameQuery(null);
    goTo("library");
  }

  function resumeRoom(nextRoom) {
    setRoom(nextRoom);
    if (nextRoom.status === "finished") return goTo("results");
    if (nextRoom.status === "playing") return goTo("game");
    if (nextRoom.status === "waiting" && nextRoom.players?.find((player) => player.wallet === profile?.wallet)?.team) return goTo("waiting");
    return goTo("team-select");
  }

  if (screen === "library") return withAppChrome(<GameLibraryScreen onSelectGame={selectCatalogGame} />);
  if (screen === "nine-ice-forts") return withAppChrome(<NineIceFortsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />);
  if (screen === "four-wing-ice-hunt") return withAppChrome(<FourWingIceHuntApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />);
  if (screen === "fishflow") return withAppChrome(<FishflowApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />);
  if (screen === "break-the-ice") return withAppChrome(<BreakTheIceApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />);
  if (screen === "ice-hunters") return withAppChrome(<IceHuntersApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />);
  if (screen === "game-preview" && selectedGame) return withAppChrome(<GamePreviewScreen game={selectedGame} onBack={exitToLibrary} />);

  if (screen === "dev-home") return withAppChrome(renderLazy(<DevPortalScreen onTestRunbook={() => goTo("test-runbook")} onDevQA={() => goTo("dev-qa")} onSettlementAdmin={() => goTo("settlement-admin")} onVaultDeployer={() => goTo("vault-deployer")} onExit={() => window.location.assign("/")} />, "Loading developer console..."));
  if (screen === "dev-qa") return withAppChrome(renderLazy(<DevQAScreen onBack={() => goTo("dev-home")} />));
  if (screen === "test-runbook") return withAppChrome(renderLazy(<TestRunbookScreen onBack={() => goTo("dev-home")} />));
  if (screen === "vault-deployer") return withAppChrome(renderLazy(<EthVaultDeployerScreen onBack={() => goTo("dev-home")} />));
  if (screen === "settlement-admin") return withAppChrome(renderLazy(<SettlementAdminScreen onBack={() => goTo("dev-home")} />));

  if (screen === "cover") return withAppChrome(<CoverScreen onContinue={() => playTrackThenGo("coverScreen", initialHighStakesRoomCode ? "profile" : "menu", COVER_TRACK_DELAY_MS)} onBackToLibrary={initialHighStakesRoomCode ? undefined : exitToLibrary} />);
  if (screen === "menu") return withAppChrome(<MainMenu onPlay={() => playTrackThenGo("playNow", "profile", PLAY_NOW_TRACK_DELAY_MS)} onSpectate={() => goTo("spectator")} onHowToPlay={() => goTo("how-to-play")} onAllGames={exitToLibrary} />);
  if (screen === "how-to-play") return withAppChrome(renderLazy(<HowToPlayScreen onBack={() => goTo("menu")} onStart={() => goTo("profile")} />));
  if (screen === "spectator") return withAppChrome(renderLazy(<SpectatorScreen initialRoomCode={initialSpectateCode} onBack={() => goTo(profile ? "hub" : "menu")} />));
  if (screen === "profile") return withAppChrome(renderLazy(<ProfileScreen onComplete={(createdProfile) => { soundManager.play("uiConfirm"); setProfile(createdProfile); goTo(initialHighStakesRoomCode ? "high-stakes" : "hub"); }} onBack={() => goTo("menu")} />));
  if (screen === "hub") return withAppChrome(renderLazy(<PlayerHubScreen profile={profile} onOpenIce={() => goTo("open-ice-menu")} onHighStakes={() => goTo("high-stakes")} onMatchHistory={() => goTo("match-history")} onLeaderboard={() => goTo("leaderboard")} onAccountActivity={() => goTo("activity")} onMyRooms={() => goTo("my-rooms")} onBack={() => goTo("profile")} />));
  if (screen === "match-history") return withAppChrome(renderLazy(<MatchHistoryScreen profile={profile} onBack={() => goTo("hub")} />));
  if (screen === "leaderboard") return withAppChrome(renderLazy(<LeaderboardScreen onBack={() => goTo("hub")} />));
  if (screen === "activity") return withAppChrome(renderLazy(<AccountActivityScreen profile={profile} onBack={() => goTo("hub")} />));
  if (screen === "my-rooms") return withAppChrome(renderLazy(<MyRoomsScreen profile={profile} onResumeRoom={resumeRoom} onBack={() => goTo("hub")} />));
  if (screen === "high-stakes") return withAppChrome(renderLazy(<HighStakesGate onBack={() => goTo("hub")}><HighStakesScreen profile={profile} initialRoomCode={initialHighStakesRoomCode} onRoomReady={(readyRoom) => { setRoom(readyRoom); goTo("team-select"); }} onBack={() => goTo("hub")} /></HighStakesGate>));
  if (screen === "open-ice-menu") return withAppChrome(renderLazy(<OpenIceMenuScreen profile={profile} onCreateRoom={() => goTo("create-room")} onJoinRoom={() => goTo("join-room")} onRoomJoined={(joinedRoom) => { soundManager.play("roomJoin"); setRoom(joinedRoom); goTo("team-select"); }} onBack={() => goTo("hub")} />));
  if (screen === "create-room") return withAppChrome(renderLazy(<CreateRoomScreen profile={profile} onRoomCreated={(createdRoom) => { soundManager.play("uiConfirm"); setRoom(createdRoom); goTo("team-select"); }} onBack={() => goTo("open-ice-menu")} />));
  if (screen === "join-room") return withAppChrome(renderLazy(<JoinRoomScreen profile={profile} onRoomJoined={(joinedRoom) => { soundManager.play("roomJoin"); setRoom(joinedRoom); goTo("team-select"); }} onBack={() => goTo("open-ice-menu")} />));
  if (screen === "team-select") return withAppChrome(renderLazy(<TeamSelectScreen room={room} profile={profile} onRoomUpdate={setRoom} onContinue={(updatedRoom) => { setRoom(updatedRoom); goTo("waiting"); }} onBack={() => goTo(roomLobbyScreen())} />));
  if (screen === "waiting") return withAppChrome(renderLazy(<WaitingRoomScreen room={room} profile={profile} onRoomUpdate={setRoom} onGameStart={(startedRoom) => { soundManager.play("gameStart"); setRoom(startedRoom); goTo("game"); }} />));
  if (screen === "game") return withAppChrome(renderLazy(<GameScreen room={room} profile={profile} onRoomUpdate={setRoom} onFinishDemo={() => goTo("results")} onMainMenu={() => goTo("hub")} onBackToLobby={() => goTo(roomLobbyScreen())} />, "Preparing battlefield..."));
  if (screen === "results") return withAppChrome(renderLazy(<ResultsScreen room={room} profile={profile} onBackToLobby={() => goTo(roomLobbyScreen())} />));
  return null;
}

function lazyNamed(loader, exportName) {
  return lazy(async () => ({ default: (await loader())[exportName] }));
}

function renderLazy(node, label) {
  return <Suspense fallback={<FrostRouteLoader label={label} />}>{node}</Suspense>;
}

function cleanInviteCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function syncGameQuery(gameId) {
  const nextUrl = new URL(window.location.href);
  if (gameId) nextUrl.searchParams.set("game", gameId);
  else nextUrl.searchParams.delete("game");
  window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}
