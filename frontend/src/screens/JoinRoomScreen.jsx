import { useRef, useState } from "react";
import { joinRoom } from "../network/socketClient.js";

export function JoinRoomScreen({ profile, onRoomJoined, onBack }) {
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function clean(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  }

  function focusCode() {
    inputRef.current?.focus();
  }

  async function submitCode() {
    const code = clean(roomCode);

    if (code.length !== 4) {
      setError("Enter 4 characters.");
      focusCode();
      return;
    }

    try {
      setBusy(true);
      setError("");
      const room = await joinRoom({ roomCode: code, profile });
      onRoomJoined(room);
    } catch (err) {
      setError(err.message || "Could not join room.");
    } finally {
      setBusy(false);
    }
  }

  const digits = roomCode.padEnd(4, " ").slice(0, 4).split("");

  return (
    <section className="open-ice-image-page">
      <div className="open-ice-image-stage join-room-stage">
        <img className="open-ice-screen-art" src="/assets/screens/join-room.png" alt="Join Room" />

        <input
          ref={inputRef}
          className="join-hidden-input"
          value={roomCode}
          maxLength={4}
          onChange={(event) => {
            setRoomCode(clean(event.target.value));
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitCode();
          }}
        />

        <div className="join-digit digit-0">{digits[0]}</div>
        <div className="join-digit digit-1">{digits[1]}</div>
        <div className="join-digit digit-2">{digits[2]}</div>
        <div className="join-digit digit-3">{digits[3]}</div>

        <button className="open-ice-hit join-code-hit" disabled={busy} onClick={focusCode} />
        <button className="open-ice-hit join-continue-hit" disabled={busy} onClick={submitCode} />
        <button className="open-ice-hit join-back-hit" disabled={busy} onClick={onBack} />

        {(error || busy) && (
          <div className={`open-ice-image-status join-status ${error ? "error" : ""}`}>
            {error || "Joining room..."}
          </div>
        )}
      </div>
    </section>
  );
}
