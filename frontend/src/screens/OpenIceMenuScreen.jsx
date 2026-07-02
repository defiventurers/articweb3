import { useEffect, useMemo, useRef, useState } from "react";
import { OptimizedImage } from "../components/OptimizedImage.jsx";
import { joinRoom, listRooms } from "../network/socketClient.js";

const OPEN_ICE_ROOMS_PER_PAGE = 9;

export function OpenIceMenuScreen({ profile, onCreateRoom, onJoinRoom, onRoomJoined, onBack }) {
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomPage, setRoomPage] = useState(0);
  const [privateCode, setPrivateCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const privateInputRef = useRef(null);

  const visibleRooms = useMemo(() => {
    const start = roomPage * OPEN_ICE_ROOMS_PER_PAGE;
    return publicRooms.slice(start, start + OPEN_ICE_ROOMS_PER_PAGE);
  }, [publicRooms, roomPage]);

  const hasNextPage = (roomPage + 1) * OPEN_ICE_ROOMS_PER_PAGE < publicRooms.length;

  useEffect(() => {
    refreshRooms();
    const onPacket = (event) => {
      const packet = event.detail;
      const nextRoom = packet?.payload?.room;
      if (packet?.type !== "room_state" || nextRoom?.roomMode !== "open_ice") return;
      setPublicRooms((current) => mergeOpenIceRoomList(current, nextRoom));
    };
    window.addEventListener("server-packet", onPacket);
    return () => window.removeEventListener("server-packet", onPacket);
  }, []);

  async function refreshRooms() {
    try {
      setError("");
      const rooms = await listRooms({ roomMode: "open_ice" });
      const publicWaitingRooms = rooms.filter((room) => room.visibility !== "private" && room.status === "waiting");
      setPublicRooms(publicWaitingRooms);
      setRoomPage((page) => clampPage(page, publicWaitingRooms.length));
    } catch (err) {
      setError(err.message || "Could not load Open Ice rooms.");
    }
  }

  async function enterRoom(codeValue) {
    const code = cleanRoomCode(codeValue);
    if (code.length !== 4) {
      setError("Enter a 4-character room code.");
      privateInputRef.current?.focus();
      return;
    }

    if (busy) return;
    try {
      setBusy(true);
      setError("");
      setStatus("Joining room...");
      const room = await joinRoom({ roomCode: code, profile });
      setPrivateCode("");
      onRoomJoined(room);
    } catch (err) {
      setError(err.message || "Could not join room.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function nextPage() {
    if (!publicRooms.length) return;
    setRoomPage((page) => (hasNextPage ? page + 1 : 0));
  }

  function openPrivateJoin() {
    privateInputRef.current?.focus();
  }

  function roomSlot(index) {
    const slotRoom = visibleRooms[index];
    return (
      <div className={`openicehub-room-card openicehub-room-${index}`} key={`openice-room-${index}`}>
        {slotRoom ? (
          <>
            <div className="openicehub-room-code">{slotRoom.roomCode}</div>
            <div className="openicehub-users-count">{roomPlayerCount(slotRoom)}/{slotRoom.maxPlayers || 4}</div>
            <button
              className="open-ice-hit openicehub-room-join-hit"
              aria-label={`Join room ${slotRoom.roomCode}`}
              disabled={busy || !canJoinOpenIceRoom(slotRoom)}
              onClick={() => enterRoom(slotRoom.roomCode)}
            />
          </>
        ) : (
          <div className="openicehub-room-empty">{index === 0 ? "No public rooms" : ""}</div>
        )}
      </div>
    );
  }

  const message = error || status;

  return (
    <section className="open-ice-image-page openicehub-page" aria-label="Open Ice Hub">
      <div className="open-ice-image-stage openicehub-stage">
        <OptimizedImage className="open-ice-screen-art" src="/assets/screens/openicehub.png" desktopSrc="/assets/screens/openicehub-desktop.png" alt="Open Ice Hub" />

        {Array.from({ length: OPEN_ICE_ROOMS_PER_PAGE }, (_, index) => roomSlot(index))}

        <input
          ref={privateInputRef}
          className="openicehub-private-input"
          value={privateCode}
          maxLength={4}
          inputMode="text"
          autoComplete="off"
          aria-label="Private room code"
          onChange={(event) => {
            setPrivateCode(cleanRoomCode(event.target.value));
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") enterRoom(privateCode);
          }}
        />

        <button className="open-ice-hit openicehub-create-hit" aria-label="Create Room" disabled={busy} onClick={onCreateRoom} />
        <button className="open-ice-hit openicehub-refresh-hit" aria-label="Refresh Rooms" disabled={busy} onClick={refreshRooms} />
        <button className="open-ice-hit openicehub-next-page-hit" aria-label="Next Page" disabled={busy || publicRooms.length <= OPEN_ICE_ROOMS_PER_PAGE} onClick={nextPage} />
        <button className="open-ice-hit openicehub-private-code-hit" aria-label="Enter private room code" disabled={busy} onClick={openPrivateJoin} />
        <button className="open-ice-hit openicehub-join-private-hit" aria-label="Join Private Room" disabled={busy} onClick={() => enterRoom(privateCode)} />
        <button className="open-ice-hit openicehub-back-hit" aria-label="Back To Hub" disabled={busy} onClick={onBack} />

        {message && <div className={`open-ice-image-status openicehub-status ${error ? "error" : ""}`}>{message}</div>}
      </div>
    </section>
  );
}

function mergeOpenIceRoomList(current, nextRoom) {
  const roomStillListed = nextRoom.visibility !== "private" && nextRoom.status === "waiting";
  const filtered = current.filter((item) => item.roomCode !== nextRoom.roomCode);
  return roomStillListed ? [nextRoom, ...filtered] : filtered;
}

function canJoinOpenIceRoom(room) {
  return room && room.status === "waiting" && !room.countdownStartTime && roomPlayerCount(room) < Number(room.maxPlayers || 4);
}

function roomPlayerCount(room) {
  return Number(room?.playerCount ?? room?.players?.length ?? 0);
}

function clampPage(page, totalRooms) {
  const maxPage = Math.max(0, Math.ceil(totalRooms / OPEN_ICE_ROOMS_PER_PAGE) - 1);
  return Math.min(page, maxPage);
}

function cleanRoomCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}
