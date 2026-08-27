import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  FrostLoadingScreen,
  FrostRouteLoader,
  warmGameAssets,
  warmHowToPlayAssets
} from "./components/FrostLoadingScreen.jsx";
import { AudioToggle } from "./components/AudioToggle.jsx";
import { ExperienceCompanion } from "./components/ExperienceCompanion.jsx";
import { HeritageExperienceFrame } from "./components/HeritageExperienceFrame.jsx";
import { CoverScreen } from "./screens/CoverScreen.jsx";
import { GameLibraryScreen } from "./screens/GameLibraryScreen.jsx";
import { GamePreviewScreen } from "./screens/GamePreviewScreen.jsx";
import { MainMenu } from "./screens/MainMenu.jsx";
import { NineIceFortsApp } from "./games/nine-ice-forts/NineIceFortsApp.jsx";
import { FourWingIceHuntApp } from "./games/four-wing-ice-hunt/FourWingIceHuntApp.jsx";
import { FishflowApp } from "./games/fishflow/FishflowApp.jsx";
import { BreakTheIceApp } from "./games/break-the-ice/BreakTheIceApp.jsx";
import { IceHuntersApp } from "./games/ice-hunters/IceHuntersApp.jsx";
import { SixteenIceWarriorsApp } from "./games/sixteen-ice-warriors/SixteenIceWarriorsApp.jsx";
import { GlacierTrailApp } from "./games/glacier-trail/GlacierTrailApp.jsx";
import { CrownRunApp } from "./games/crown-run/CrownRunApp.jsx";
import { FortyGlacierGuardsApp } from "./games/forty-glacier-guards/FortyGlacierGuardsApp.jsx";
import { SkyTempleRunApp } from "./games/sky-temple-run/SkyTempleRunApp.jsx";
import { IceRingsApp } from "./games/ice-rings/IceRingsApp.jsx";
import { CowrieKingdomsApp } from "./games/cowrie-kingdoms/CowrieKingdomsApp.jsx";
import { TwoStonesApp } from "./games/two-stones/TwoStonesApp.jsx";
import { AuroraVultureApp } from "./games/aurora-vulture/AuroraVultureApp.jsx";
import { PolarTablanApp } from "./games/polar-tablan/PolarTablanApp.jsx";
import { AuroraGanjifaAcademyApp } from "./games/aurora-ganjifa-academy/AuroraGanjifaAcademyApp.jsx";
import { SigeApp } from "./games/sige/SigeApp.jsx";
import { SevenIceRingsApp } from "./games/seven-ice-rings/SevenIceRingsApp.jsx";
import { KhasiFishflowApp } from "./games/khasi-fishflow/KhasiFishflowApp.jsx";
import { RumaIcePuzzleApp } from "./games/ruma-ice-puzzle/RumaIcePuzzleApp.jsx";
import { HeritageArcadeApp } from "./games/heritage-arcade/HeritageArcadeApp.jsx";
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
const PLAYABLE_GAME_IDS = new Set([
  "heritage-arcade",
  "nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail",
  "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture",
  "khasi-fishflow", "seven-ice-rings", "ruma-ice-puzzle", "polar-tablan", "sige", "aurora-ganjifa-academy"
]);

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const calibrationTarget = import.meta.env.DEV ? params.get("calibrate") : null;
  const isDevPath = import.meta.env.DEV && /^\/dev\/?$/.test(window.location.pathname);
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
            : PLAYABLE_GAME_IDS.has(requestedGame?.id)
              ? requestedGame.id
              : requestedGame?.available
                ? "cover"
                : requestedGame
                  ? "game-preview"
                  : "kingdoms";
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

  function roomLobbyScreen(targetRoom = room) { return targetRoom?.roomMode === "high_stakes" ? "high-stakes" : "open-ice-menu"; }
  function goTo(nextScreen, options = {}) { window.clearTimeout(transitionTimerRef.current); if (options.tapSound !== false) soundManager.play("uiTap", { cooldownMs: 80 }); if (nextScreen === "how-to-play") warmHowToPlayAssets(); if (nextScreen === "game" || nextScreen === "team-select" || nextScreen === "waiting") warmGameAssets(); setScreen(nextScreen); }
  function playTrackThenGo(trackName, nextScreen, delayMs) { window.clearTimeout(transitionTimerRef.current); soundManager.unlock(); unlockUiAudio(); soundManager.playTrack(trackName, { restart: true }); transitionTimerRef.current = window.setTimeout(() => goTo(nextScreen, { tapSound: false }), delayMs); }
  function withAppChrome(node, heritageGameId = null) {
    return <>
      <AudioToggle />
      {heritageGameId ? <HeritageExperienceFrame gameId={heritageGameId}>{node}</HeritageExperienceFrame> : node}
      <ExperienceCompanion gameId={heritageGameId} />
    </>;
  }
  function selectCatalogGame(gameId) { const game = getCatalogGame(gameId); if (!game) return; setSelectedGameId(game.id); syncGameQuery(game.id); if (PLAYABLE_GAME_IDS.has(game.id)) return goTo(game.id); goTo(game.available ? "cover" : "game-preview"); }
  function exitToLibrary() { setSelectedGameId(null); syncGameQuery(null); goTo("library"); }
  function resumeRoom(nextRoom) { setRoom(nextRoom); if (nextRoom.status === "finished") return goTo("results"); if (nextRoom.status === "playing") return goTo("game"); if (nextRoom.status === "waiting" && nextRoom.players?.find((player) => player.wallet === profile?.wallet)?.team) return goTo("waiting"); return goTo("team-select"); }

  if (screen === "kingdoms") return withAppChrome(<GameLibraryScreen onSelectGame={selectCatalogGame} />);
  if (screen === "library") return withAppChrome(<GameLibraryScreen onSelectGame={selectCatalogGame} />);
  if (screen === "heritage-arcade") return withAppChrome(<HeritageArcadeApp onExitToLibrary={exitToLibrary} profile={profile} />, screen);
  if (screen === "nine-ice-forts") return withAppChrome(<NineIceFortsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "four-wing-ice-hunt") return withAppChrome(<FourWingIceHuntApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "fishflow") return withAppChrome(<FishflowApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "break-the-ice") return withAppChrome(<BreakTheIceApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "ice-hunters") return withAppChrome(<IceHuntersApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "sixteen-ice-warriors") return withAppChrome(<SixteenIceWarriorsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "glacier-trail") return withAppChrome(<GlacierTrailApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "crown-run") return withAppChrome(<CrownRunApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "forty-glacier-guards") return withAppChrome(<FortyGlacierGuardsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "sky-temple-run") return withAppChrome(<SkyTempleRunApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "ice-rings") return withAppChrome(<IceRingsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "cowrie-kingdoms") return withAppChrome(<CowrieKingdomsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "two-stones") return withAppChrome(<TwoStonesApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "aurora-vulture") return withAppChrome(<AuroraVultureApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "polar-tablan") return withAppChrome(<PolarTablanApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "aurora-ganjifa-academy") return withAppChrome(<AuroraGanjifaAcademyApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "sige") return withAppChrome(<SigeApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "seven-ice-rings") return withAppChrome(<SevenIceRingsApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "khasi-fishflow") return withAppChrome(<KhasiFishflowApp onExitToLibrary={exitToLibrary} profile={profile} onProfileChange={setProfile} />, screen);
  if (screen === "ruma-ice-puzzle") return withAppChrome(<RumaIcePuzzleApp onExitToLibrary={exitToLibrary} />, screen);
  if (screen === "game-preview" && selectedGame) return withAppChrome(<GamePreviewScreen game={selectedGame} onBack={exitToLibrary} />);

  if (screen === "dev-home") return withAppChrome(renderLazy(<DevPortalScreen onTestRunbook={() => goTo("test-runbook")} onDevQA={() => goTo("dev-qa")} onSettlementAdmin={() => goTo("settlement-admin")} onVaultDeployer={() => goTo("vault-deployer")} onExit={() => window.location.assign("/")} />, "Loading developer console..."));
  if (screen === "dev-qa") return withAppChrome(renderLazy(<DevQAScreen onBack={() => goTo("dev-home")} />));
  if (screen === "test-runbook") return withAppChrome(renderLazy(<TestRunbookScreen onBack={() => goTo("dev-home")} />));
  if (screen === "vault-deployer") return withAppChrome(renderLazy(<EthVaultDeployerScreen onBack={() => goTo("dev-home")} />));
  if (screen === "settlement-admin") return withAppChrome(renderLazy(<SettlementAdminScreen onBack={() => goTo("dev-home")} />));

  if (screen === "cover") return withAppChrome(<CoverScreen onContinue={() => playTrackThenGo("coverScreen", initialHighStakesRoomCode ? "profile" : "menu", COVER_TRACK_DELAY_MS)} onBackToLibrary={initialHighStakesRoomCode ? undefined : exitToLibrary} />);
  if (screen === "menu") return withAppChrome(<MainMenu onPlay={() => playTrackThenGo("playNow", "profile", PLAY_NOW_TRACK_DELAY_MS)} onSpectate={() => goTo("spectator")} onHowToPlay={() => goTo("how-to-play")} onAllGames={() => goTo("kingdoms")} />);
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

function lazyNamed(loader, exportName) { return lazy(async () => ({ default: (await loader())[exportName] })); }
function renderLazy(node, label) { return <Suspense fallback={<FrostRouteLoader label={label} />}>{node}</Suspense>; }
function cleanInviteCode(value) { return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); }
function syncGameQuery(gameId) { const nextUrl = new URL(window.location.href); if (gameId) nextUrl.searchParams.set("game", gameId); else nextUrl.searchParams.delete("game"); window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`); }
