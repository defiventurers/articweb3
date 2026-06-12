import { formatEther } from "viem";

const TEAM_LABELS = {
  green: "Abster",
  red: "Retsba",
  blue: "Pengu",
  yellow: "Polly"
};

export function ResultsScreen({ room, onBackToLobby }) {
  const placements = room.placements?.length ? room.placements : fallbackPlacements(room);
  const payoutByWallet = new Map((room.payoutPlan || []).map((item) => [item.wallet, item]));
  const isEscrowTestRoom = room.roomMode === "high_stakes";

  return (
    <section className="screen">
      <div className="card">
        <h1>Match Complete</h1>

        <p className="note">
          Room {room.roomCode} · {isEscrowTestRoom ? "Testnet escrow result" : "Open Ice result"}
        </p>

        <div className="room-list">
          {placements.map((player, index) => {
            const payout = payoutByWallet.get(player.wallet);
            return (
              <div className="room-row" key={player.wallet || `${player.team}-${index}`}>
                <strong>{player.position || index + 1}. {player.name || "Player"}</strong>
                <span>{TEAM_LABELS[player.team] || player.team}</span>
                {payout && <span>{formatEther(BigInt(payout.payoutWei || "0"))} ETH · +{payout.points} pts</span>}
              </div>
            );
          })}
        </div>

        {isEscrowTestRoom && (
          <div className="rules-panel">
            <strong>Settlement</strong>
            <span>Status: {room.settlementStatus || "pending"}</span>
            {room.settlementTxHash && <span>Tx: {room.settlementTxHash.slice(0, 10)}...{room.settlementTxHash.slice(-6)}</span>}
            {!room.settlementTxHash && <span>Configure the backend signer before automatic settlement.</span>}
          </div>
        )}

        <button className="primary-btn" onClick={onBackToLobby}>
          Back To Lobby
        </button>
      </div>
    </section>
  );
}

function fallbackPlacements(room) {
  return (room.players || []).map((player, index) => ({
    ...player,
    position: index + 1
  }));
}
