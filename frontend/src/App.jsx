import { Suspense, lazy, useState } from "react";
import {
  FrostLoadingScreen,
  FrostRouteLoader,
  warmGameAssets,
  warmHowToPlayAssets
} from "./components/FrostLoadingScreen.jsx";
import { CoverScreen } from "./screens/CoverScreen.jsx";
import { MainMenu } from "./screens/MainMenu.jsx";
import "./styles/mobileProof.css";

const CalibrationScreen = lazyNamed(() => import("./screens/CalibrationScreen.jsx"), "CalibrationScreen");
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

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const calibrationTarget = params.get("calibrate");
  const skipLoader = params.get("skipLoader") === "1" || Boolean(calibrationTarget);
  const initialSpectateCode = params.get("spectate") || "";
  const [assetsReady, setAssetsReady] = useState(skipLoader);
  const [screen, setScreen] = useState(initialSpectateCode ? "spectator" : "cover");
  const [profile, setProfile] = useState(null);
  const [room, setRoom] = useState(null);

  if (calibrationTarget) return renderLazy(<CalibrationScreen target={calibrationTarget} />, "Loading calibration deck...");
  if (!assetsReady) return <FrostLoadingScreen onReady={() => setAssetsReady(true)} />;

  function roomLobbyScreen(targetRoom = room) {
    return targetRoom?.roomMode === "high_stakes" ? "high-stakes" : "open-ice-menu";
  }

  function goTo(nextScreen) {
    if (nextScreen === "how-to-play") warmHowToPlayAssets();
    if (nextScreen === "game" || nextScreen === "team-select" || nextScreen === "waiting") warmGameAssets();
    setScreen(nextScreen);
  }

  function resumeRoom(nextRoom) {
    setRoom(nextRoom);
    if (nextRoom.status === "finished") return goTo("results");
    if (nextRoom.status === "playing") return goTo("game");
    if (nextRoom.status === "waiting" && nextRoom.players?.find((player) => player.wallet === profile?.wallet)?.team) return goTo("waiting");
    return goTo("team-select");
  }

  if (screen === "cover") return <CoverScreen onContinue={() => goTo("menu")} />;
  if (screen === "menu") return <MainMenu onPlay={() => goTo("profile")} onSpectate={() => goTo("spectator")} onHowToPlay={() => goTo("how-to-play")} />;
  if (screen === "how-to-play") return renderLazy(<HowToPlayScreen onBack={() => goTo("menu")} onStart={() => goTo("profile")} />);
  if (screen === "spectator") return renderLazy(<SpectatorScreen initialRoomCode={initialSpectateCode} onBack={() => goTo(profile ? "hub" : "menu")} />);
  if (screen === "profile") return renderLazy(<ProfileScreen onComplete={(createdProfile) => { setProfile(createdProfile); goTo("hub"); }} onBack={() => goTo("menu")} />);
  if (screen === "hub") return renderLazy(<PlayerHubScreen profile={profile} onOpenIce={() => goTo("open-ice-menu")} onHighStakes={() => goTo("high-stakes")} onMatchHistory={() => goTo("match-history")} onLeaderboard={() => goTo("leaderboard")} onAccountActivity={() => goTo("activity")} onMyRooms={() => goTo("my-rooms")} onDevQA={() => goTo("dev-qa")} onVaultDeployer={() => goTo("vault-deployer")} onSettlementAdmin={() => goTo("settlement-admin")} onBack={() => goTo("profile")} />);
  if (screen === "dev-qa") return renderLazy(<DevQAScreen onBack={() => goTo("hub")} />);
  if (screen === "match-history") return renderLazy(<MatchHistoryScreen profile={profile} onBack={() => goTo("hub")} />);
  if (screen === "leaderboard") return renderLazy(<LeaderboardScreen onBack={() => goTo("hub")} />);
  if (screen === "activity") return renderLazy(<AccountActivityScreen profile={profile} onBack={() => goTo("hub")} />);
  if (screen === "my-rooms") return renderLazy(<MyRoomsScreen profile={profile} onResumeRoom={resumeRoom} onBack={() => goTo("hub")} />);
  if (screen === "vault-deployer") return renderLazy(<EthVaultDeployerScreen onBack={() => goTo("hub")} />);
  if (screen === "settlement-admin") return renderLazy(<SettlementAdminScreen onBack={() => goTo("hub")} />);
  if (screen === "high-stakes") return renderLazy(<HighStakesScreen profile={profile} onRoomReady={(readyRoom) => { setRoom(readyRoom); goTo("team-select"); }} onBack={() => goTo("hub")} />);
  if (screen === "open-ice-menu") return renderLazy(<OpenIceMenuScreen profile={profile} onCreateRoom={() => goTo("create-room")} onJoinRoom={() => goTo("join-room")} onRoomJoined={(joinedRoom) => { setRoom(joinedRoom); goTo("team-select"); }} onBack={() => goTo("hub")} />);
  if (screen === "create-room") return renderLazy(<CreateRoomScreen profile={profile} onRoomCreated={(createdRoom) => { setRoom(createdRoom); goTo("team-select"); }} onBack={() => goTo("open-ice-menu")} />);
  if (screen === "join-room") return renderLazy(<JoinRoomScreen profile={profile} onRoomJoined={(joinedRoom) => { setRoom(joinedRoom); goTo("team-select"); }} onBack={() => goTo("open-ice-menu")} />);
  if (screen === "team-select") return renderLazy(<TeamSelectScreen room={room} profile={profile} onRoomUpdate={setRoom} onContinue={(updatedRoom) => { setRoom(updatedRoom); goTo("waiting"); }} onBack={() => goTo(roomLobbyScreen())} />);
  if (screen === "waiting") return renderLazy(<WaitingRoomScreen room={room} profile={profile} onRoomUpdate={setRoom} onGameStart={(startedRoom) => { setRoom(startedRoom); goTo("game"); }} />);
  if (screen === "game") return renderLazy(<GameScreen room={room} profile={profile} onRoomUpdate={setRoom} onFinishDemo={() => goTo("results")} onBackToLobby={() => goTo(roomLobbyScreen())} />, "Preparing battlefield...");
  if (screen === "results") return renderLazy(<ResultsScreen room={room} profile={profile} onBackToLobby={() => goTo(roomLobbyScreen())} />);
  return null;
}

function lazyNamed(loader, exportName) {
  return lazy(async () => ({ default: (await loader())[exportName] }));
}

function renderLazy(node, label) {
  return <Suspense fallback={<FrostRouteLoader label={label} />}>{node}</Suspense>;
}
