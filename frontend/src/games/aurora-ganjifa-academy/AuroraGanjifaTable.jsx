import { seatName } from "./rules.js";

export function GanjifaCard({ card, legal = false, hidden = false, onPlay, disabled = false, compact = false }) {
  if (hidden) return <div className={`ag-card back ${compact ? "compact" : ""}`} aria-label="Hidden Ganjifa card"><span>❄</span></div>;
  return (
    <button type="button" className={`ag-card ${card.suitClass} ${legal ? "legal" : ""} ${compact ? "compact" : ""}`} disabled={disabled || !legal} onClick={() => legal && onPlay?.(card.id)} aria-label={`${card.suitName} ${card.rankLabel}${legal ? ", legal play" : ""}`}>
      <span className="ag-card-symbol" aria-hidden="true">{card.symbol}</span>
      <strong>{card.rankLabel}</strong>
      <small>{card.suitName}</small>
    </button>
  );
}

export function AuroraGanjifaTable({ state, hand = [], legalActions = [], onPlay, viewerSeat, revealHand = true }) {
  const legalIds = new Set(legalActions.map((action) => action.cardId));
  return (
    <div className="ag-table-shell">
      <div className="ag-score-ring">
        {state.seats.map((seat) => (
          <article key={seat} className={`ag-seat ${seat} ${state.currentPlayer === seat ? "active" : ""}`}>
            <strong>{seatName(seat)}</strong>
            <span>{state.handCounts?.[seat] ?? state.hands?.[seat]?.length ?? 0} cards</span>
            <small>{state.tricksWon[seat]} tricks · {state.capturedCards[seat]} captured</small>
          </article>
        ))}
      </div>
      <div className="ag-trick" aria-label={`Trick ${state.trickNumber}`}>
        <div className="ag-trick-title"><span>TRICK {state.trickNumber}</span><strong>{state.ledSuit ? `${state.ledSuit.toUpperCase()} led` : `${seatName(state.leader)} leads`}</strong></div>
        <div className="ag-trick-cards">
          {state.currentTrick.length ? state.currentTrick.map((play) => <div key={`${play.seat}-${play.card.id}`} className="ag-played"><GanjifaCard card={play.card} compact /><small>{seatName(play.seat)}</small></div>) : <p>Lead one circular card into the aurora.</p>}
        </div>
      </div>
      <section className="ag-hand" aria-label={viewerSeat ? `${seatName(viewerSeat)} private hand` : "Private hand"}>
        <header><div><strong>Your private hand</strong><span>{revealHand ? "Only this seat can see these faces" : "Pass the device before revealing"}</span></div><b>{hand.length}</b></header>
        <div className="ag-hand-cards">
          {hand.map((card) => revealHand ? <GanjifaCard key={card.id} card={card} legal={legalIds.has(card.id)} disabled={state.phase !== "playing"} onPlay={onPlay} /> : <GanjifaCard key={card.id} card={card} hidden />)}
        </div>
      </section>
    </div>
  );
}
