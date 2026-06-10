import { useState } from "react";
import { CoverScreen } from "./screens/CoverScreen.jsx";
import { MainMenu } from "./screens/MainMenu.jsx";
import { ProfileScreen } from "./screens/ProfileScreen.jsx";
import { LobbyScreen } from "./screens/LobbyScreen.jsx";
import { WaitingRoomScreen } from "./screens/WaitingRoomScreen.jsx";

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
          setScreen("lobby");
        }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "lobby") {
    return (
      <LobbyScreen
        profile={profile}
        onJoinRoom={(joinedRoom) => {
          setRoom(joinedRoom);
          setScreen("waiting");
        }}
        onBack={() => setScreen("profile")}
      />
    );
  }

  if (screen === "waiting") {
    return (
      <WaitingRoomScreen
        room={room}
        onRoomUpdate={setRoom}
        onGameStart={(startedRoom) => {
          setRoom(startedRoom);
          alert("Game screen comes next.");
        }}
      />
    );
  }

  return null;
}
