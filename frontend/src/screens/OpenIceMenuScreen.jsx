export function OpenIceMenuScreen({ profile, onCreateRoom, onJoinRoom, onBack }) {
  return (
    <section className="open-ice-flow-page">
      <div className="open-ice-flow-card">
        <h1>Open Ice</h1>

        <p className="open-ice-player">
          {profile.name} · {profile.points} points
        </p>

        <p className="open-ice-note">
          Play freely with no crypto required.
        </p>

        <button className="open-ice-choice primary" onClick={onCreateRoom}>
          <strong>Create Room</strong>
          <span>Start a new Open Ice match and invite players by room code.</span>
        </button>

        <button className="open-ice-choice" onClick={onJoinRoom}>
          <strong>Join Room</strong>
          <span>Enter a room code from a friend.</span>
        </button>

        <button className="open-ice-back" onClick={onBack}>
          Back To Hub
        </button>
      </div>
    </section>
  );
}
