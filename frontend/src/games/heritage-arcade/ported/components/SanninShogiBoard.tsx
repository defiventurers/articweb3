import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, RotateCcw, Undo2 } from "lucide-react";
import {
  ALL_HEXES, applySanninDrop, applySanninMove, canPromote, HAND_ROLES, hexKey, initialSanninState,
  isPleasureGarden, legalDropHexes, legalTargets, notation, pieceAt, PLAYER_LABELS, PLAYERS, ROLE_LABELS,
  territoryOwner, type Hex, type SanninHandRole, type SanninPiece, type SanninPlayer, type SanninRole, type SanninState,
} from "@/game/sanninShogiRules";
import "@/sannin-shogi.css";

const GLYPH: Record<SanninRole, string> = { king: "王", rook: "飛", bishop: "角", gold: "金", silver: "銀", knight: "桂", lance: "香", pawn: "歩" };
const PROMOTED_GLYPH: Partial<Record<SanninRole, string>> = { king: "皇", rook: "龍", bishop: "馬", silver: "全", lance: "杏", pawn: "と" };
const PLAYER_COLOR: Record<SanninPlayer, string> = { first: "#ef6d72", middle: "#5bc8f1", last: "#74d594" };
const PLAYER_ROTATION: Record<SanninPlayer, number> = { middle: 0, first: 120, last: 240 };
const SIZE = 33;
const ROOT3 = Math.sqrt(3);
const CENTER = { x: 410, y: 390 };
const centerOf = ({ q, r }: Hex) => ({ x: CENTER.x + ROOT3 * SIZE * (q + r / 2), y: CENTER.y + 1.5 * SIZE * r });
const polygon = (hex: Hex) => {
  const center = centerOf(hex);
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    return `${center.x + SIZE * Math.cos(angle)},${center.y + SIZE * Math.sin(angle)}`;
  }).join(" ");
};

const GUIDE: { role: SanninRole; text: string }[] = [
  { role: "king", text: "Steps along the six orthogonal hex directions. A first unmoved, never-checked King may castle within its own territory." },
  { role: "rook", text: "Ranges on five documented orthogonal rays; promotion extends it to all six." },
  { role: "bishop", text: "Ranges on all six hex diagonals; promotion adds one-step orthogonal movement." },
  { role: "gold", text: "Six asymmetric one-step directions relative to the player’s home edge." },
  { role: "silver", text: "Six one-step directions; promotion additionally opens two long vertical rays." },
  { role: "knight", text: "Six fixed jumps on the hex geometry. It does not promote." },
  { role: "lance", text: "Ranges on two forward rays; promotion adds the two rear diagonal rays." },
  { role: "pawn", text: "Steps on either of the two forward rays; promotion gives Gold movement." },
];

function Piece({ piece }: { piece: SanninPiece }) {
  const glyph = piece.promoted ? (PROMOTED_GLYPH[piece.role] || GLYPH[piece.role]) : GLYPH[piece.role];
  return <g className={`sannin-piece ${piece.owner} ${piece.promoted ? "promoted" : ""}`} transform={`rotate(${PLAYER_ROTATION[piece.owner]})`}>
    <path d="M -23 -26 L 23 -26 L 30 -8 L 25 29 L -25 29 L -30 -8 Z" />
    <text y="2">{glyph}</text>
    <text className="sannin-piece-role" y="17">{piece.promoted ? `+${ROLE_LABELS[piece.role]}` : ROLE_LABELS[piece.role]}</text>
  </g>;
}

export default function SanninShogiBoard({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<SanninState>(() => initialSanninState());
  const [history, setHistory] = useState<SanninState[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<SanninHandRole | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const selectedPiece = state.pieces.find((piece) => piece.id === selectedPieceId) || null;
  const moveTargets = useMemo(() => selectedPiece ? legalTargets(selectedPiece, state) : [], [selectedPiece, state]);
  const dropTargets = useMemo(() => selectedHand ? legalDropHexes(state, state.turn, selectedHand) : [], [selectedHand, state]);
  const targetKeys = useMemo(() => new Set((selectedHand ? dropTargets : moveTargets).map(hexKey)), [selectedHand, dropTargets, moveTargets]);

  const clearSelection = () => { setSelectedPieceId(null); setSelectedHand(null); };
  const commit = (next: SanninState | null) => {
    if (!next) return;
    setHistory((past) => [...past.slice(-120), state]); setState(next); clearSelection();
  };
  const reset = () => { setState(initialSanninState()); setHistory([]); clearSelection(); };
  const undo = () => {
    const snapshot = history.at(-1); if (!snapshot) return;
    setState(snapshot); setHistory((past) => past.slice(0, -1)); clearSelection();
  };
  const chooseHex = (hex: Hex) => {
    if (state.winner) return;
    const occupant = pieceAt(state.pieces, hex);
    if (selectedHand) {
      if (targetKeys.has(hexKey(hex))) commit(applySanninDrop(state, selectedHand, hex));
      else if (occupant?.owner === state.turn) { setSelectedPieceId(occupant.id); setSelectedHand(null); }
      return;
    }
    if (occupant?.owner === state.turn) { setSelectedPieceId((current) => current === occupant.id ? null : occupant.id); return; }
    if (!selectedPiece || !targetKeys.has(hexKey(hex))) return;
    const promotable = canPromote(selectedPiece, hex);
    const promote = promotable && window.confirm(`Promote ${ROLE_LABELS[selectedPiece.role]}?`);
    commit(applySanninMove(state, selectedPiece.id, hex, promote));
  };
  const chooseHand = (role: SanninHandRole) => {
    if (state.winner || state.hands[state.turn][role] <= 0) return;
    setSelectedHand((current) => current === role ? null : role); setSelectedPieceId(null);
  };

  const hand = (player: SanninPlayer) => <article className={`sannin-player-card ${state.turn === player ? "active" : ""} ${state.eliminated.includes(player) ? "eliminated" : ""}`} style={{ "--player": PLAYER_COLOR[player] } as React.CSSProperties}>
    <header><i /><div><strong>{PLAYER_LABELS[player]}</strong><span>{state.eliminated.includes(player) ? "ELIMINATED" : state.turn === player ? "TO MOVE" : "IN FIELD"}</span></div></header>
    <section>{HAND_ROLES.map((role) => {
      const count = state.hands[player][role]; const selectable = player === state.turn && count > 0;
      return <button type="button" key={role} disabled={!selectable} className={selectedHand === role && player === state.turn ? "selected" : ""} onClick={() => player === state.turn && chooseHand(role)}><b>{GLYPH[role]}</b><span>{ROLE_LABELS[role]}</span><em>×{count}</em></button>;
    })}</section>
  </article>;

  return <main className="sannin-screen">
    <header className="sannin-header">
      <button className="sannin-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Atlas</button>
      <div><span>MODERN DOCUMENTED VARIANT · FREE-FOR-ALL CORE</span><h1>Sannin Shogi <em>— Three Homes, One Pleasure Garden</em></h1><p>127 hexes · 3 armies · 18 pieces each · captures, drops, promotion, checkmate and Pleasure Garden victory</p></div>
      <nav><button type="button" onClick={() => setGuideOpen((open) => !open)}><BookOpen size={14} /> Rules</button><button type="button" disabled={!history.length} onClick={undo}><Undo2 size={14} /> Undo</button><button type="button" onClick={reset}><RotateCcw size={14} /> Reset</button></nav>
    </header>

    <section className="sannin-layout">
      <aside className="sannin-match-rail">
        <span className="sannin-eyebrow">THREE-COUNTRY STATE</span><h2>{state.winner ? `${PLAYER_LABELS[state.winner]} wins` : `${PLAYER_LABELS[state.turn]} to move`}</h2><p>{state.note}</p>
        {PLAYERS.map(hand)}
        <div className="sannin-last"><b>LAST COMMAND</b><span>{state.lastMove ? `${PLAYER_LABELS[state.lastMove.player]} ${ROLE_LABELS[state.lastMove.role]}${state.lastMove.drop ? " drop" : state.lastMove.castle ? " castle" : ""} → ${notation(state.lastMove.to)}${state.lastMove.promoted ? "+" : ""}` : "Historical opening formation deployed."}</span></div>
      </aside>

      <section className="sannin-board-panel">
        <div className="sannin-board-caption"><span>PLEASURE GARDEN HEX FIELD</span><strong>COMMAND {state.moveNumber}</strong></div>
        <svg className="sannin-board" viewBox="0 0 820 780" aria-label="Sannin Shogi 127-cell hexagonal board">
          <defs><filter id="sannin-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity=".35" /></filter></defs>
          <path className="sannin-board-back" d="M410 34 L710 207 L710 553 L410 726 L110 553 L110 207 Z" />
          {ALL_HEXES.map((hex) => {
            const center = centerOf(hex); const occupant = pieceAt(state.pieces, hex); const owner = territoryOwner(hex);
            const target = targetKeys.has(hexKey(hex)); const garden = isPleasureGarden(hex);
            const last = state.lastMove && ((state.lastMove.from && hexKey(state.lastMove.from) === hexKey(hex)) || hexKey(state.lastMove.to) === hexKey(hex));
            return <g key={hexKey(hex)} className={`sannin-hex ${owner ? `territory-${owner}` : "neutral"} ${garden ? "garden" : ""} ${target ? "legal" : ""} ${target && occupant ? "capture" : ""} ${last ? "last" : ""} ${selectedPieceId === occupant?.id ? "selected" : ""}`} onClick={() => chooseHex(hex)} role="button" tabIndex={0} aria-label={`${notation(hex)}${garden ? ", Pleasure Garden" : ""}`}>
              <polygon points={polygon(hex)} />
              {garden && <><circle className="sannin-garden-ring" cx={center.x} cy={center.y} r="22" /><text className="sannin-garden-mark" x={center.x} y={center.y + 5}>楽</text></>}
              {target && !occupant && <circle className="sannin-target" cx={center.x} cy={center.y} r="7" />}
              {occupant && <g transform={`translate(${center.x} ${center.y})`} filter="url(#sannin-shadow)"><Piece piece={occupant} /></g>}
              <text className="sannin-coordinate" x={center.x + 19} y={center.y + 25}>{notation(hex)}</text>
            </g>;
          })}
          <text className="sannin-territory-label first" x="650" y="410">FIRST</text>
          <text className="sannin-territory-label middle" x="410" y="682">MIDDLE</text>
          <text className="sannin-territory-label last" x="170" y="410">LAST</text>
        </svg>
        <div className="sannin-board-key"><span><i className="first" /> First territory</span><span><i className="middle" /> Middle territory</span><span><i className="last" /> Last territory</span><span><i className="garden" /> Pleasure Garden</span><span><i className="legal" /> legal move / drop</span></div>
      </section>

      <aside className="sannin-guide-rail">
        <span className="sannin-eyebrow">HEX DOCTRINE</span><h2>Three orientations, one rules graph.</h2><p>Each army reads “forward” from its own home edge. Select a piece or a captured hand-piece and the board resolves that player’s rotated movement geometry.</p>
        <div className="sannin-rule-list">{GUIDE.map(({ role, text }) => <article key={role} className={selectedPiece?.role === role || selectedHand === role ? "focused" : ""}><b>{GLYPH[role]}</b><div><strong>{ROLE_LABELS[role]}</strong><span>{text}</span></div></article>)}</div>
        {guideOpen && <div className="sannin-source-note"><b>PHASE 1 SCOPE</b><p>This table implements the documented three-way board, setup, movement, captures, drops, promotions, check/checkmate elimination, first-King castling and Pleasure Garden victory. Alliance formation, promoted-King “illumination”, and repetition adjudication remain deliberately disabled until their ambiguous source clauses receive a separate audit.</p><a href="https://en.wikipedia.org/wiki/Sannin_shogi" target="_blank" rel="noreferrer">Read source overview ↗</a></div>}
      </aside>
    </section>
  </main>;
}
