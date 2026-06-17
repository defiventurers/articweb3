export function InvitedRoomPanel({ roomCode, busy, onJoin, onDismiss, onCopyLink }) {
  return (
    <div className="highstakes-modal" role="dialog" aria-modal="true" aria-label="Invited locked match room">
      <div className="highstakes-modal-card">
        <h3>Invited Room {roomCode}</h3>
        <p>This invite opened High Stakes Lab with the room code already loaded.</p>
        <p>Join the room, confirm the lock in AGW, then select your team after lock confirmation.</p>
        <button type="button" className="highstakes-modal-primary" disabled={busy} onClick={onJoin}>{busy ? "Joining..." : "Join Invited Room"}</button>
        <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={onCopyLink}>Copy Invite Link</button>
        <button type="button" className="highstakes-modal-cancel" disabled={busy} onClick={onDismiss}>Dismiss Invite</button>
      </div>
    </div>
  );
}
