export function ResultsScreen({ room, onBackToLobby }) {
  return (
    <section className="screen">
      <div className="card">
        <h1>Match Complete</h1>

        <p className="note">
          Results screen placeholder. Final placements will be calculated by the server later.
        </p>

        <div className="room-list">
          {room.players.map((player, index) => (
            <div className="room-row" key={player.wallet}>
              <strong>{index + 1}. {player.name}</strong>
              <span>{player.team}</span>
            </div>
          ))}
        </div>

        <button className="primary-btn" onClick={onBackToLobby}>
          Back To Lobby
        </button>
      </div>
    </section>
  );
}
