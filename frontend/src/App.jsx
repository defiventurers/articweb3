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

export default function App() {
  const [screen, setScreen] = useState("cover");
  const [profile, setProfile] = useState(null);
  const [room, setRoom] = useState(null);

  if (screen === "cover") {
    return <CoverScreen onContinue={() => setScreen("menu")} />;
  }

  if (screen === "menu") {
    return (
      <MainMenu
        onPlay={() => setScreen("profile")}
        onHowToPlay={() => alert("How to play comes after the lobby works.")}
      />
    );
  }

  if (screen === "profile") {
    return (
      <ProfileScreen
        onComplete={(createdProfile) => {
          setProfile(createdProfile);
          setScreen("hub");
        }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "hub") {
    return (
      <PlayerHubScreen
        profile={profile}
        onOpenIce={() => setScreen("open-ice-menu")}
        onHighStakes={() => setScreen("high-stakes")}
        onBack={() => setScreen("profile")}
      />
    );
  }

  if (screen === "high-stakes") {
    return (
      <HighStakesScreen
        profile={profile}
        onBack={() => setScreen("hub")}
      />
    );
  }

  if (screen === "open-ice-menu") {
    return (
      <OpenIceMenuScreen
        profile={profile}
        onCreateRoom={() => setScreen("create-room")}
        onJoinRoom={() => setScreen("join-room")}
        onBack={() => setScreen("hub")}
      />
    );
  }

  if (screen === "create-room") {
    return (
      <CreateRoomScreen
        profile={profile}
        onRoomCreated={(createdRoom) => {
          setRoom(createdRoom);
          setScreen("team-select");
        }}
        onBack={() => setScreen("open-ice-menu")}
      />
    );
  }

  if (screen === "join-room") {
    return (
      <JoinRoomScreen
        profile={profile}
        onRoomJoined={(joinedRoom) => {
          setRoom(joinedRoom);
          setScreen("team-select");
        }}
        onBack={() => setScreen("open-ice-menu")}
      />
    );
  }

  if (screen === "team-select") {
    return (
      <TeamSelectScreen
        room={room}
        profile={profile}
        onRoomUpdate={setRoom}
        onContinue={(updatedRoom) => {
          setRoom(updatedRoom);
          setScreen("waiting");
        }}
        onBack={() => setScreen("open-ice-menu")}
      />
    );
  }

  if (screen === "waiting") {
    return (
      <WaitingRoomScreen
        room={room}
        profile={profile}
        onRoomUpdate={setRoom}
        onGameStart={(startedRoom) => {
          setRoom(startedRoom);
          setScreen("game");
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <GameScreen
        room={room}
        profile={profile}
        onRoomUpdate={setRoom}
        onFinishDemo={() => setScreen("results")}
        onBackToLobby={() => setScreen("open-ice-menu")}
      />
    );
  }

  if (screen === "results") {
    return (
      <ResultsScreen
        room={room}
        onBackToLobby={() => setScreen("open-ice-menu")}
      />
    );
  }

  return null;
}
