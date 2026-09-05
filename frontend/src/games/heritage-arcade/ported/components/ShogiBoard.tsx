import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, RotateCcw, Undo2 } from "lucide-react";
import {
  applyShogiDrop, applyShogiMove, canPromote, HAND_ROLES, initialShogiState, legalDropSquares, legalTargets,
  mustPromote, pieceAt, ROLE_LABELS, SIDE_LABELS, squareKey,
  type HandRole, type ShogiPiece, type ShogiRole, type ShogiSide, type ShogiSquare, type ShogiState,
} from "@/game/shogiRules";
import "@/shogi.css";

const GLYPH: Record<ShogiRole, string> = { king: "王", rook: "飛", bishop: "角", gold: "金", silver: "銀", knight: "桂", lance: "香", pawn: "歩" };
const PROMOTED_GLYPH: Partial<Record<ShogiRole, string>> = { rook: "龍", bishop: "馬", silver: "全", knight: "圭", lance: "杏", pawn: "と" };
const MOVE_GUIDE: { role: ShogiRole; text: string }[] = [
  { role: "king", text: "One square in any direction." },
  { role: "rook", text: "Any distance orthogonally; promoted Rook also steps one square diagonally." },
  { role: "bishop", text: "Any distance diagonally; promoted Bishop also steps one square orthogonally." },
  { role: "gold", text: "One square forward, sideways, backward, or forward-diagonal; never backward-diagonal." },
  { role: "silver", text: "One square forward or diagonally; promoted Silver moves as Gold." },
  { role: "knight", text: "Jumps two forward and one sideways; promoted Knight moves as Gold." },
  { role: "lance", text: "Any unobstructed distance straight forward; promoted Lance moves as Gold." },
  { role: "pawn", text: "One square straight forward; promoted Pawn (Tokin) moves as Gold." },
];
const ALL_SQUARES: ShogiSquare[] = Array.from({ length: 81 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 }));

function PieceFace({ piece }: { piece: ShogiPiece }) {
  const glyph = piece.promoted ? (PROMOTED_GLYPH[piece.role] || GLYPH[piece.role]) : GLYPH[piece.role];
  return <span className={`shogi-koma ${piece.side} ${piece.promoted ? "promoted" : ""}`}><b>{glyph}</b><small>{piece.promoted ? `+${ROLE_LABELS[piece.role]}` : ROLE_LABELS[piece.role]}</small></span>;
}

export default function ShogiBoard({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ShogiState>(() => initialShogiState());
  const [history, setHistory] = useState<ShogiState[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<HandRole | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const selectedPiece = state.pieces.find((piece) => piece.id === selectedPieceId) || null;
  const moveTargets = useMemo(() => selectedPiece ? legalTargets(selectedPiece, state.pieces) : [], [selectedPiece, state.pieces]);
  const dropTargets = useMemo(() => selectedHand ? legalDropSquares(state, state.turn, selectedHand) : [], [selectedHand, state]);
  const targetKeys = useMemo(() => new Set((selectedHand ? dropTargets : moveTargets).map(squareKey)), [selectedHand, dropTargets, moveTargets]);

  const clearSelection = () => { setSelectedPieceId(null); setSelectedHand(null); };
  const commit = (next: ShogiState | null) => {
    if (!next) return;
    setHistory((past) => [...past.slice(-100), state]);
    setState(next);
    clearSelection();
  };
  const reset = () => { setState(initialShogiState()); setHistory([]); clearSelection(); };
  const undo = () => {
    const snapshot = history.at(-1);
    if (!snapshot) return;
    setState(snapshot); setHistory((past) => past.slice(0, -1)); clearSelection();
  };
  const chooseSquare = (square: ShogiSquare) => {
    if (state.winner) return;
    const occupant = pieceAt(state.pieces, square);
    if (selectedHand) {
      if (targetKeys.has(squareKey(square))) commit(applyShogiDrop(state, selectedHand, square));
      else if (occupant?.side === state.turn) { setSelectedPieceId(occupant.id); setSelectedHand(null); }
      return;
    }
    if (occupant?.side === state.turn) { setSelectedPieceId((id) => id === occupant.id ? null : occupant.id); return; }
    if (!selectedPiece || !targetKeys.has(squareKey(square))) return;
    const forced = mustPromote(selectedPiece, square);
    const optional = canPromote(selectedPiece, square) && !forced;
    const promote = forced || (optional && window.confirm(`Promote ${ROLE_LABELS[selectedPiece.role]}?`));
    commit(applyShogiMove(state, selectedPiece.id, square, promote));
  };
  const chooseHand = (role: HandRole) => {
    if (state.winner || state.hands[state.turn][role] <= 0) return;
    setSelectedHand((current) => current === role ? null : role); setSelectedPieceId(null);
  };

  const handPanel = (side: ShogiSide) => <div className={`shogi-hand ${side} ${state.turn === side ? "active" : ""}`}>
    <div><strong>{SIDE_LABELS[side]}</strong><span>{side === "sente" ? "先手 · Black" : "後手 · White"}</span></div>
    <section>{HAND_ROLES.map((role) => {
      const count = state.hands[side][role]; const selectable = side === state.turn && count > 0;
      return <button key={role} type="button" disabled={!selectable} className={selectedHand === role && side === state.turn ? "selected" : ""} onClick={() => side === state.turn && chooseHand(role)}><b>{GLYPH[role]}</b><span>{ROLE_LABELS[role]}</span><em>×{count}</em></button>;
    })}</section>
  </div>;

  return <main className="shogi-screen">
    <header className="shogi-header">
      <button className="shogi-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Atlas</button>
      <div><span>DOCUMENTED RULES · JAPANESE CHESS</span><h1>Shogi <em>— The Generals' Ice Court</em></h1><p>9×9 board · 40 pieces · captures become drops · promotion in the enemy camp</p></div>
      <nav><button type="button" onClick={() => setGuideOpen((open) => !open)}><BookOpen size={14} /> Rules</button><button type="button" disabled={!history.length} onClick={undo}><Undo2 size={14} /> Undo</button><button type="button" onClick={reset}><RotateCcw size={14} /> Reset</button></nav>
    </header>

    <section className="shogi-layout">
      <aside className="shogi-left-rail">
        <span className="shogi-eyebrow">MATCH STATE</span><h2>{state.winner ? `${SIDE_LABELS[state.winner]} wins` : `${SIDE_LABELS[state.turn]} to move`}</h2><p>{state.note}</p>
        {handPanel("gote")}
        <div className="shogi-last"><b>LAST MOVE</b><span>{state.lastMove ? `${SIDE_LABELS[state.lastMove.side]} ${ROLE_LABELS[state.lastMove.role]}${state.lastMove.drop ? " drop" : ""} → ${9 - state.lastMove.to.col}${String.fromCharCode(97 + state.lastMove.to.row)}${state.lastMove.promoted ? "+" : ""}` : "Opening position"}</span></div>
        {handPanel("sente")}
      </aside>

      <section className="shogi-board-panel">
        <div className="shogi-board-caption"><span>ICE COURT · STANDARD HONSHOGI</span><strong>MOVE {state.moveNumber}</strong></div>
        <div className="shogi-board" role="grid" aria-label="Standard nine by nine Shogi board">
          {ALL_SQUARES.map((square) => {
            const piece = pieceAt(state.pieces, square);
            const target = targetKeys.has(squareKey(square));
            const last = state.lastMove && ((state.lastMove.from && squareKey(state.lastMove.from) === squareKey(square)) || squareKey(state.lastMove.to) === squareKey(square));
            return <button type="button" role="gridcell" key={squareKey(square)} className={`shogi-cell ${target ? "legal" : ""} ${target && piece ? "capture" : ""} ${last ? "last" : ""} ${selectedPieceId === piece?.id ? "selected" : ""}`} onClick={() => chooseSquare(square)}>
              {piece && <PieceFace piece={piece} />}
              {target && !piece && <i className="shogi-target-dot" />}
              <small className="shogi-coordinate">{9 - square.col}{String.fromCharCode(97 + square.row)}</small>
            </button>;
          })}
        </div>
        <div className="shogi-board-key"><span><i className="legal" /> legal move / drop</span><span><i className="capture" /> capture</span><span><i className="last" /> last move</span><span>Captured pieces return unpromoted and may be dropped.</span></div>
      </section>

      <aside className="shogi-guide-rail">
        <span className="shogi-eyebrow">FIELD DOCTRINE</span><h2>Promotion and drops are live.</h2><p>Select one of your pieces, or select a captured piece from your hand to see only legal destinations.</p>
        <div className="shogi-rule-list">{MOVE_GUIDE.map(({ role, text }) => <article key={role} className={selectedPiece?.role === role || selectedHand === role ? "focused" : ""}><b className="shogi-mini-koma">{GLYPH[role]}</b><div><strong>{ROLE_LABELS[role]}</strong><span>{text}</span></div></article>)}</div>
        {guideOpen && <div className="shogi-source-note"><b>LIVE RULES</b><p>Promotion-zone moves, mandatory promotion, nifu, dead-rank drops, self-check filtering and pawn-drop mate prohibition are enforced. Tournament repetition and entering-king adjudication are reserved for the audit pass.</p><a href="https://www.shogi.or.jp/match/taikyoku_rules/" target="_blank" rel="noreferrer">Japan Shogi Association rules ↗</a></div>}
      </aside>
    </section>
  </main>;
}
