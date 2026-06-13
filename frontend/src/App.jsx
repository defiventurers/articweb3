import { useState } from "react";
import { CoverScreen } from "./screens/CoverScreen.jsx";
import { MainMenu } from "./screens/MainMenu.jsx";
import { ProfileScreen } from "./screens/ProfileScreen.jsx";
import { PlayerHubScreen } from "./screens/PlayerHubScreen.jsx";
import { OpenIceMenuScreen } from "./screens/OpenIceMenuScreen.jsx";
import { CreateRoomScreen } from "./screens/CreateRoomScreen.jsx";
import { JoinRoomScreen } from "./screens/JoinRoomScreen.jsx";
import { TeamSelectScreen } from "./screens/TeamSelectScreen.jsx";
import { HighStakesScreen } from "./screens/HighStakesScreen.jsx";
import { WaitingRoomScreen } from "./screens/WaitingRoomScreen.jsx";
import { GameScreen } from "./screens/GameScreen.jsx";
import { ResultsScreen } from "./screens/ResultsScreen.jsx";
import { EthVaultDeployerScreen } from "./screens/EthVaultDeployerScreen.jsx";
import { SettlementAdminScreen } from "./screens/SettlementAdminScreen.jsx";
import { MatchHistoryScreen } from "./screens/MatchHistoryScreen.jsx";
import { LeaderboardScreen } from "./screens/LeaderboardScreen.jsx";
import { MyRoomsScreen } from "./screens/MyRoomsScreen.jsx";
import { AccountActivityScreen } from "./screens/AccountActivityScreen.jsx";
import { SpectatorScreen } from "./screens/SpectatorScreen.jsx";
import { DevQAScreen } from "./screens/DevQAScreen.jsx";
import "./styles/mobileProof.css";

export default function App() {
  const initialSpectateCode = new URLSearchParams(window.location.search).get("spectate") || "";
  const [screen, setScreen] = useState(initialSpectateCode ? "spectator" : "cover");
  const [profile, setProfile] = useState(null);
  const [room, setRoom] = useState(null);
  function roomLobbyScreen(targetRoom = room) { return targetRoom?.roomMode === "high_stakes" ? "high-stakes" : "open-ice-menu"; }
  function resumeRoom(nextRoom) { setRoom(nextRoom); if (nextRoom.status === "finished") return setScreen("results"); if (nextRoom.status === "playing") return setScreen("game"); if (nextRoom.status === "waiting" && nextRoom.players?.find((player) => player.wallet === profile?.wallet)?.team) return setScreen("waiting"); return setScreen("team-select"); }
  if (screen === "cover") return <CoverScreen onContinue={() => setScreen("menu")} />;
  if (screen === "menu") return <MainMenu onPlay={() => setScreen("profile")} onSpectate={() => setScreen("spectator")} onHowToPlay={() => alert("How to play comes after the lobby works.")} />;
  if (screen === "spectator") return <SpectatorScreen initialRoomCode={initialSpectateCode} onBack={() => setScreen(profile ? "hub" : "menu")} />;
  if (screen === "profile") return <ProfileScreen onComplete={(createdProfile) => { setProfile(createdProfile); setScreen("hub"); }} onBack={() => setScreen("menu")} />;
  if (screen === "hub") return <PlayerHubScreen profile={profile} onOpenIce={() => setScreen("open-ice-menu")} onHighStakes={() => setScreen("high-stakes")} onMatchHistory={() => setScreen("match-history")} onLeaderboard={() => setScreen("leaderboard")} onAccountActivity={() => setScreen("activity")} onMyRooms={() => setScreen("my-rooms")} onDevQA={() => setScreen("dev-qa")} onVaultDeployer={() => setScreen("vault-deployer")} onSettlementAdmin={() => setScreen("settlement-admin")} onBack={() => setScreen("profile")} />;
  if (screen === "dev-qa") return <DevQAScreen onBack={() => setScreen("hub")} />;
  if (screen === "match-history") return <MatchHistoryScreen profile={profile} onBack={() => setScreen("hub")} />;
  if (screen === "leaderboard") return <LeaderboardScreen onBack={() => setScreen("hub")} />;
  if (screen === "activity") return <AccountActivityScreen profile={profile} onBack={() => setScreen("hub")} />;
  if (screen === "my-rooms") return <MyRoomsScreen profile={profile} onResumeRoom={resumeRoom} onBack={() => setScreen("hub")} />;
  if (screen === "vault-deployer") return <EthVaultDeployerScreen onBack={() => setScreen("hub")} />;
  if (screen === "settlement-admin") return <SettlementAdminScreen onBack={() => setScreen("hub")} />;
  if (screen === "high-stakes") return <HighStakesScreen profile={profile} onRoomReady={(readyRoom) => { setRoom(readyRoom); setScreen("team-select"); }} onBack={() => setScreen("hub")} />;
  if (screen === "open-ice-menu") return <OpenIceMenuScreen profile={profile} onCreateRoom={() => setScreen("create-room")} onJoinRoom={() => setScreen("join-room")} onBack={() => setScreen("hub")} />;
  if (screen === "create-room") return <CreateRoomScreen profile={profile} onRoomCreated={(createdRoom) => { setRoom(createdRoom); setScreen("team-select"); }} onBack={() => setScreen("open-ice-menu")} />;
  if (screen === "join-room") return <JoinRoomScreen profile={profile} onRoomJoined={(joinedRoom) => { setRoom(joinedRoom); setScreen("team-select"); }} onBack={() => setScreen("open-ice-menu")} />;
  if (screen === "team-select") return <TeamSelectScreen room={room} profile={profile} onRoomUpdate={setRoom} onContinue={(updatedRoom) => { setRoom(updatedRoom); setScreen("waiting"); }} onBack={() => setScreen(roomLobbyScreen())} />;
  if (screen === "waiting") return <WaitingRoomScreen room={room} profile={profile} onRoomUpdate={setRoom} onGameStart={(startedRoom) => { setRoom(startedRoom); setScreen("game"); }} />;
  if (screen === "game") return <GameScreen room={room} profile={profile} onRoomUpdate={setRoom} onFinishDemo={() => setScreen("results")} onBackToLobby={() => setScreen(roomLobbyScreen())} />;
  if (screen === "results") return <ResultsScreen room={room} profile={profile} onBackToLobby={() => setScreen(roomLobbyScreen())} />;
  return null;
}
