import { useState } from "react";
import { OptimizedImage } from "../components/OptimizedImage.jsx";
import { createRoom } from "../network/socketClient.js";

export function CreateRoomScreen({ profile, onRoomCreated, onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createOpenIceRoom(visibility) {
    if (busy) return;

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
    <section className="open-ice-image-page">
      <div className="open-ice-image-stage create-room-stage">
        <OptimizedImage className="open-ice-screen-art" src="/assets/screens/openice-createroom.png" desktopSrc="/assets/screens/openice-createroom-desktop.png" alt="Create Room" />

        <button className="open-ice-hit create-public-hit" disabled={busy} onClick={() => createOpenIceRoom("public")} />
        <button className="open-ice-hit create-private-hit" disabled={busy} onClick={() => createOpenIceRoom("private")} />
        <button className="open-ice-hit create-back-hit" disabled={busy} onClick={onBack} />

        {(error || busy) && (
          <div className={`open-ice-image-status ${error ? "error" : ""}`}>
            {error || "Creating room..."}
          </div>
        )}
      </div>
    </section>
  );
}
