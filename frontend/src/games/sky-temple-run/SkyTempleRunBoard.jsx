import { ROUTES, SAFE_SPACES, SKY_TEMPLE_RUN_RULESET, SPACES, SPACE_BY_ID, getPieceSpaceId } from "./rules.js";

export function SkyTempleRunBoard({ state, legalActions = [], onAction, interactive = true }) {
  const legalByPiece = new Map(legalActions.map((action) => [action.pieceId, action]));
  const piecesBySpace = new Map();
  Object.values(state.pieces).flat().forEach((piece) => {
    const spaceId = getPieceSpaceId(piece);
    if (spaceId) piecesBySpace.set(spaceId, piece);
  });
  const lineSegments = routeSegments();

  return (
    <div className="str-board" role="grid" aria-label="Sky Temple Run route board">
      <svg className="str-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="str-route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#baf8ff" />
            <stop offset="0.55" stopColor="#64bfff" />
            <stop offset="1" stopColor="#d6a5ff" />
          </linearGradient>
        </defs>
        {lineSegments.map(([from, to]) => {
          const a = SPACE_BY_ID[from];
          const b = SPACE_BY_ID[to];
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        <path className="str-temple-outline" d="M75 35 L84 22 L93 35 M75 65 L84 78 L93 65" />
      </svg>

      {SPACES.map((space) => {
        const piece = piecesBySpace.get(space.id);
        const legal = piece ? legalByPiece.get(piece.id) : null;
        const safe = SAFE_SPACES.has(space.id);
        const pieceNumber = piece ? Number(piece.id.split("-").at(-1)) : null;
        const aria = piece
          ? `${piece.side === "aurora" ? "Aurora" : "Ember"} pilgrim ${pieceNumber} on ${space.label}${legal ? ", legal move" : ""}`
          : `${space.id} empty${safe ? " safe rest square" : ""}`;
        return (
          <div
            className={`str-space ${safe ? "safe" : "corridor"} ${piece ? "occupied" : ""}`}
            key={space.id}
            style={{ left: `${space.x}%`, top: `${space.y}%` }}
            role="gridcell"
            aria-label={aria}
          >
            {safe && <span className="str-safe-mark" aria-hidden="true">✦</span>}
            {piece && (
              <button
                type="button"
                className={`str-piece ${piece.side} ${legal ? "legal" : ""}`}
                disabled={!interactive || !legal}
                onClick={() => legal && onAction?.(legal)}
                aria-label={aria}
              >
                <span aria-hidden="true">{piece.side === "aurora" ? "♙" : "♟"}</span>
                <small>{pieceNumber}</small>
              </button>
            )}
          </div>
        );
      })}

      <div className="str-gate-label aurora" aria-hidden="true">AURORA GATE</div>
      <div className="str-gate-label ember" aria-hidden="true">EMBER GATE</div>
      <div className="str-temple-label aurora" aria-hidden="true">SKY TEMPLE</div>
      <div className="str-temple-label ember" aria-hidden="true">SKY TEMPLE</div>
    </div>
  );
}

export function PilgrimDock({ side, state, legalActions = [], onAction, interactive = true }) {
  const legalByPiece = new Map(legalActions.map((action) => [action.pieceId, action]));
  const homePieces = state.pieces[side].filter((piece) => piece.status === "home");
  const finished = state.pieces[side].filter((piece) => piece.status === "finished").length;
  return (
    <aside className={`str-dock ${side}`}>
      <header>
        <span>{side === "aurora" ? "✦" : "◆"}</span>
        <div><strong>{side === "aurora" ? "Aurora Pilgrims" : "Ember Pilgrims"}</strong><small>{state.captureLicense[side] ? "Temple gate unlocked" : "Capture required for inner route"}</small></div>
      </header>
      <div className="str-home-pieces">
        {!homePieces.length && <em>No pilgrims waiting</em>}
        {homePieces.map((piece) => {
          const legal = legalByPiece.get(piece.id);
          const number = Number(piece.id.split("-").at(-1));
          const aria = `${side === "aurora" ? "Aurora" : "Ember"} pilgrim ${number} at home${legal ? ", legal entry" : ""}`;
          return <button key={piece.id} disabled={!interactive || !legal} className={legal ? "legal" : ""} onClick={() => legal && onAction?.(legal)} aria-label={aria}><span>{side === "aurora" ? "♙" : "♟"}</span><small>{number}</small></button>;
        })}
      </div>
      <footer><span>{homePieces.length} home</span><span>{finished}/{SKY_TEMPLE_RUN_RULESET.piecesPerPlayer} finished</span><span>{state.captures[side]} captures</span></footer>
    </aside>
  );
}

export function CowrieTray({ roll, onRoll, canRoll, busy = false }) {
  const shown = roll || { faces: [0, 0, 0, 0, 0, 0], value: null, mouthsUp: null };
  return (
    <section className="str-cowrie-tray" aria-label="Six cowries">
      <div className="str-cowries" aria-label={roll ? `Cowrie result ${roll.value}` : "Cowries ready"}>
        {shown.faces.map((face, index) => <i className={face ? "open" : "closed"} key={index}><span>{face ? "◡" : "●"}</span></i>)}
      </div>
      <div className="str-roll-copy">
        <strong>{roll ? `${roll.value}` : "CAST"}</strong>
        <small>{roll ? (roll.mouthsUp === 0 ? "No mouths up · counts as 12" : `${roll.mouthsUp} mouths up`) : "Six cowries"}</small>
      </div>
      <button type="button" className="str-roll-button" disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : "Cast Cowries"}</button>
    </section>
  );
}

function routeSegments() {
  const seen = new Set();
  const segments = [];
  Object.values(ROUTES).forEach((route) => {
    for (let index = 0; index < route.length - 1; index += 1) {
      const pair = [route[index], route[index + 1]];
      const key = [...pair].sort().join("|");
      if (!seen.has(key)) { seen.add(key); segments.push(pair); }
    }
  });
  return segments;
}
