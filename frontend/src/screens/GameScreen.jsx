export function GameScreen({ room, profile, onFinishDemo, onBackToLobby }) {
  return (
    <section className="screen">
      <div className="card">
        <h1>Game Room {room.roomCode}</h1>

        <p className="note">
          This is the game placeholder. The lobby works; next we will port the real board here.
        </p>

        <div className="room-list">
          {room.players.map((player) => (
            <div className="room-row" key={player.wallet}>
              <strong>{player.name}</strong>
              <span>{player.team}</span>
            </div>
          ))}
        </div>

        <p className="note">You are playing as {profile.name}.</p>

        <button className="primary-btn" onClick={onFinishDemo}>
          Finish Demo Match
        </button>

        <button className="secondary-btn" onClick={onBackToLobby}>
          Back To Lobby
        </button>
      </div>
    </section>
  );
}
