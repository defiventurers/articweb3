import { useState } from "react";
import { createRoom } from "../network/socketClient.js";

export function CreateRoomScreen({ profile, onRoomCreated, onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(visibility) {
    try {
      setBusy(true);
      setError("");
      const room = await createRoom({
        visibility,
        roomMode: "open_ice",
        profile
      });
      onRoomCreated(room);
    } catch (err) {
      setError(err.message || "Could not create room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="open-ice-flow-page">
      <div className="open-ice-flow-card">
        <h1>Create Room</h1>

        <p className="open-ice-note">
          Choose how players should enter this Open Ice match.
        </p>

        <button
          className="open-ice-choice primary"
          disabled={busy}
          onClick={() => handleCreate("public")}
        >
          <strong>Public Room</strong>
          <span>Creates a normal room with a shareable code.</span>
        </button>

        <button
          className="open-ice-choice"
          disabled={busy}
          onClick={() => handleCreate("private")}
        >
          <strong>Private Room</strong>
          <span>Code-only room for friends and testing.</span>
        </button>

        <button className="open-ice-back" disabled={busy} onClick={onBack}>
          Back
        </button>

        {error && <p className="open-ice-error">{error}</p>}
      </div>
    </section>
  );
}
