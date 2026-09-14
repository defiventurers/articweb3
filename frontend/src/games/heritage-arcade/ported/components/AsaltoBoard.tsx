/** Arctic Dominion adaptation of the documented two-player Asalto fortress game. */
import { useMemo, useState } from "react";
import { CLANS, ClanId } from "@/game/millsRules";

type Side = "officer" | "rebel";
type Tab = "play" | "rules" | "research";
type Variant = "guided" | "huffing";
type Piece = { id: string; side: Side; node: string };
type State = { phase: "deploy" | "play"; turn: Side; pieces: Piece[]; selected: string | null; captureChain: string | null; winner: Side | null; note: string; action: number };

const id = (row: number, col: number) => `${row}:${col}`;
export const ASALTO_POINTS = Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, col) => ({ row, col, id: id(row, col), valid: (row >= 2 && row <= 4) || (col >= 2 && col <= 4) }))).flat().filter((point) => point.valid);
const pointMap = new Map(ASALTO_POINTS.map((point) => [point.id, point]));
export const ASALTO_FORT = new Set(ASALTO_POINTS.filter((point) => point.row <= 2 && point.col >= 2 && point.col <= 4).map((point) => point.id));

/* The historical diagram is an orthogonal lattice with alternating diagonal routes. */
export const ASALTO_EDGES = ASALTO_POINTS.flatMap((point) => {
  const candidates = [[0, 1], [1, 0], ...(point.row % 2 === point.col % 2 ? [[1, 1], [1, -1]] : [])];
  return candidates.map(([dr, dc]) => [point.id, id(point.row + dr, point.col + dc)] as const).filter(([, b]) => pointMap.has(b));
});
const adjacency = new Map(ASALTO_POINTS.map((point) => [point.id, [] as string[]]));
ASALTO_EDGES.forEach(([a, b]) => { adjacency.get(a)!.push(b); adjacency.get(b)!.push(a); });
const connected = (a: string, b: string) => adjacency.get(a)?.includes(b) ?? false;
const occupied = (state: State, node: string) => state.pieces.find((piece) => piece.node === node);

const distanceToFort = (start: string) => {
  if (ASALTO_FORT.has(start)) return 0;
  const queue: [string, number][] = [[start, 0]];
  const seen = new Set([start]);
  while (queue.length) {
    const [node, distance] = queue.shift()!;
    for (const next of adjacency.get(node) ?? []) {
      if (ASALTO_FORT.has(next)) return distance + 1;
      if (!seen.has(next)) { seen.add(next); queue.push([next, distance + 1]); }
    }
  }
  return Number.POSITIVE_INFINITY;
};

const rebelStart: Piece[] = ASALTO_POINTS.filter((point) => !ASALTO_FORT.has(point.id)).map((point, index) => ({ id: `rebel-${index}`, side: "rebel", node: point.id }));
export const createAsaltoState = (): State => ({ phase: "deploy", turn: "officer", pieces: rebelStart, selected: null, captureChain: null, winner: null, note: "Place both Breakwater Wardens on empty fortress points.", action: 0 });

export function officerCaptures(state: State, piece: Piece) {
  const from = pointMap.get(piece.node)!;
  return [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc])).filter(([dr, dc]) => dr || dc).map(([dr, dc]) => {
    const over = id(from.row + dr, from.col + dc);
    const land = id(from.row + dr * 2, from.col + dc * 2);
    return connected(piece.node, over) && connected(over, land) && occupied(state, over)?.side === "rebel" && !occupied(state, land) ? { over, land } : null;
  }).filter(Boolean) as { over: string; land: string }[];
}

export function legalTargets(state: State, variant: Variant = "guided") {
  if (!state.selected || state.phase !== "play" || state.winner) return [];
  const piece = state.pieces.find((item) => item.id === state.selected);
  if (!piece || piece.side !== state.turn) return [];
  if (piece.side === "officer") {
    const captures = officerCaptures(state, piece);
    if (captures.length && (variant === "guided" || state.captureChain)) return captures.map((capture) => capture.land);
    if (state.captureChain) return [];
    const anyCapture = state.pieces.filter((item) => item.side === "officer").some((item) => officerCaptures(state, item).length);
    if (variant === "guided" && anyCapture) return [];
    if (variant === "huffing") return [...captures.map((capture) => capture.land), ...(adjacency.get(piece.node) ?? []).filter((target) => !occupied(state, target))];
  }
  return (adjacency.get(piece.node) ?? []).filter((target) => {
    if (occupied(state, target)) return false;
    if (piece.side === "officer") return true;
    if (ASALTO_FORT.has(piece.node)) return ASALTO_FORT.has(target);
    return distanceToFort(target) < distanceToFort(piece.node);
  });
}

function sideCanMove(state: State, side: Side, variant: Variant) {
  return state.pieces.filter((piece) => piece.side === side).some((piece) => legalTargets({ ...state, phase: "play", turn: side, selected: piece.id, winner: null }, variant).length);
}

function finishTurn(state: State, variant: Variant, note: string): State {
  const rebels = state.pieces.filter((piece) => piece.side === "rebel");
  const officers = state.pieces.filter((piece) => piece.side === "officer");
  if (rebels.length <= 8) return { ...state, winner: "officer", selected: null, captureChain: null, note: `${note} Only eight Rebels remain, so the fortress can no longer be filled.` };
  if (Array.from(ASALTO_FORT).every((node) => occupied(state, node)?.side === "rebel")) return { ...state, winner: "rebel", selected: null, captureChain: null, note: `${note} Rebels occupy all nine fortress points.` };
  if (!officers.length) return { ...state, winner: "rebel", selected: null, captureChain: null, note: `${note} Both Wardens have been huffed.` };
  const next: Side = state.turn === "officer" ? "rebel" : "officer";
  const probe = { ...state, turn: next, selected: null, captureChain: null, winner: null };
  if (!sideCanMove(probe, next, variant)) return { ...state, winner: state.turn, selected: null, captureChain: null, note: `${note} ${next === "officer" ? "The Wardens are" : "The Rebels are"} trapped.` };
  return { ...state, turn: next, selected: null, captureChain: null, note: `${note} ${next === "officer" ? "Wardens" : "Rebels"} to move.` };
}

const ruleSections = [
  ["Objective", "Rebels win by occupying all nine fortress points or leaving both Wardens without a legal move. Wardens win once only eight Rebels remain, because nine are required to fill the fort."],
  ["Setup", "Place all 24 Rebels on the 24 points outside the shaded fortress. Place the two Wardens on any two different fortress points. Rebels take the first turn."],
  ["Rebel turn", "Move one Rebel to an adjacent empty point along an etched route that takes it closer to the fortress. Once inside, it may move along fortress routes but may never leave."],
  ["Warden turn", "Move one Warden to an adjacent empty connected point in any direction, or jump a neighboring Rebel to the empty point immediately beyond it on the same straight route."],
  ["Capture chain", "After a jump, continue with that Warden while another jump is available. Direction may change between jumps. Each jumped Rebel is removed immediately."],
  ["No pass", "A player with a legal move must make one. If neither Warden can move, Rebels win; if no Rebel can advance, Wardens win."],
];

export default function AsaltoBoard({ roster, onBack }: { roster: ClanId[]; onBack: () => void }) {
  const officerClan = roster[0]; const rebelClan = roster[1] ?? "retsba";
  const [game, setGame] = useState<State>(createAsaltoState); const [history, setHistory] = useState<State[]>([]);
  const [tab, setTab] = useState<Tab>("play"); const [variant, setVariant] = useState<Variant>("guided");
  const legal = useMemo(() => legalTargets(game, variant), [game, variant]);
  const mandatoryOfficerIds = useMemo(() => game.turn === "officer" ? new Set(game.pieces.filter((piece) => piece.side === "officer" && officerCaptures(game, piece).length).map((piece) => piece.id)) : new Set<string>(), [game]);
  const push = (next: State) => { setHistory((past) => [...past.slice(-49), game]); setGame(next); };
  const reset = () => { setHistory([]); setGame(createAsaltoState()); setTab("play"); };

  const act = (node: string) => {
    if (game.winner || tab !== "play") return;
    if (game.phase === "deploy") {
      if (!ASALTO_FORT.has(node) || occupied(game, node)) return;
      const officers = game.pieces.filter((piece) => piece.side === "officer");
      const pieces = [...game.pieces, { id: `officer-${officers.length}`, side: "officer" as const, node }];
      push(officers.length === 1 ? { phase: "play", turn: "rebel", pieces, selected: null, captureChain: null, winner: null, note: "Rebels move first. Follow an etched route toward the fortress.", action: 0 } : { ...game, pieces, note: "Place the second Warden on another fortress point." }); return;
    }
    const piece = occupied(game, node);
    if (piece?.side === game.turn && (!game.captureChain || piece.id === game.captureChain)) { push({ ...game, selected: game.selected === piece.id ? null : piece.id, note: `${piece.side === "officer" ? "Warden" : "Rebel"} selected.` }); return; }
    if (!game.selected || !legal.includes(node)) return;
    const moving = game.pieces.find((item) => item.id === game.selected)!;
    const capture = moving.side === "officer" ? officerCaptures(game, moving).find((item) => item.land === node) : undefined;
    const missedCapture = variant === "huffing" && moving.side === "officer" && mandatoryOfficerIds.size > 0 && !capture;
    let pieces = game.pieces.filter((item) => item.id !== (capture ? occupied(game, capture.over)?.id : "")).map((item) => item.id === moving.id ? { ...item, node } : item);
    if (missedCapture) pieces = pieces.filter((item) => item.id !== moving.id);
    const moved = { ...game, pieces, selected: moving.id, captureChain: null, action: game.action + 1 };
    if (capture) {
      const movedPiece = pieces.find((item) => item.id === moving.id)!;
      if (officerCaptures(moved, movedPiece).length) { push({ ...moved, captureChain: moving.id, note: "Jump captured a Rebel. Continue the highlighted capture chain." }); return; }
    }
    push(finishTurn(moved, variant, missedCapture ? "A required jump was declined; that Warden is huffed." : capture ? "A Warden captured a Rebel." : `${moving.side === "officer" ? "Warden" : "Rebel"} moved.`));
  };

  const activeClan = game.turn === "officer" ? officerClan : rebelClan;
  return <main className="compact-screen asalto-screen">
    <header className="table-header"><button type="button" className="text-button" onClick={onBack}>← Back to Icebound Atlas</button><div className="table-title"><span className="eyebrow">ASALTO · FORTRESS BREAKWATER</span><h1>Hold the icegate.</h1><p>Two Wardens against twenty-four advancing Rebels.</p></div><div className="table-actions"><button type="button" onClick={reset}>Restart</button><button type="button" disabled={!history.length} onClick={() => { const last = history.at(-1); if (last) { setHistory((past) => past.slice(0, -1)); setGame(last); } }}>Undo</button></div></header>
    <nav className="asalto-tabs" aria-label="Asalto sections">{(["play", "rules", "research"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "rules" ? "Rulebook" : item === "research" ? "Research Notes" : "Play"}</button>)}</nav>
    {tab === "play" && <section className="asalto-layout"><aside className="match-rail"><div className="compass-status"><span className="pulse-dot" style={{ background: CLANS[activeClan].color }} /><span>{game.winner ? "EXPEDITION ENDED" : game.captureChain ? "CAPTURE CHAIN" : game.phase === "deploy" ? "DEPLOYMENT" : "ACTIVE TURN"}</span></div><h2>{game.winner ? `${game.winner === "officer" ? CLANS[officerClan].name : CLANS[rebelClan].name} wins` : game.phase === "deploy" ? "Choose the icegate" : `${game.turn === "officer" ? CLANS[officerClan].name : CLANS[rebelClan].name}'s turn`}</h2><p aria-live="polite">{game.note}</p><div className="match-player-stack"><article className={`match-player ${game.turn === "officer" ? "is-turn" : ""}`} style={{ "--clan": CLANS[officerClan].color } as React.CSSProperties}><img src={CLANS[officerClan].portrait} alt="" /><div><strong>Wardens · {CLANS[officerClan].name}</strong><span>{game.pieces.filter((piece) => piece.side === "officer").length} remaining</span></div></article><article className={`match-player ${game.turn === "rebel" ? "is-turn" : ""}`} style={{ "--clan": CLANS[rebelClan].color } as React.CSSProperties}><img src={CLANS[rebelClan].portrait} alt="" /><div><strong>Rebels · {CLANS[rebelClan].name}</strong><span>{game.pieces.filter((piece) => piece.side === "rebel").length} advancing</span></div></article></div><label className="asalto-variant"><span>Capture rule</span><select value={variant} disabled={game.action > 0} onChange={(event) => setVariant(event.target.value as Variant)}><option value="guided">Guided mandatory</option><option value="huffing">Historic huffing</option></select><small>{variant === "guided" ? "The interface only permits required jumps." : "Declining any available jump removes the Warden moved."}</small></label></aside>
      <section className="asalto-board" aria-label="Asalto board, fortress at the top"><svg className="asalto-routes" viewBox="0 0 700 700" aria-hidden="true">{ASALTO_EDGES.map(([a, b]) => { const p = pointMap.get(a)!; const q = pointMap.get(b)!; return <line key={`${a}-${b}`} x1={50 + p.col * 100} y1={50 + p.row * 100} x2={50 + q.col * 100} y2={50 + q.row * 100} />; })}<path className="fort-outline" d="M225 18 H475 V275 H225 Z" /></svg><div className="asalto-stamp">33 POINTS · 9-POINT ICEGATE</div>{ASALTO_POINTS.map((point) => { const piece = occupied(game, point.id); const deploy = game.phase === "deploy" && ASALTO_FORT.has(point.id) && !piece; const mustCapture = piece && mandatoryOfficerIds.has(piece.id); return <button key={point.id} type="button" onClick={() => act(point.id)} className={`asalto-node ${ASALTO_FORT.has(point.id) ? "fort" : ""} ${legal.includes(point.id) ? "legal" : ""} ${game.selected === piece?.id ? "selected" : ""} ${mustCapture ? "must-capture" : ""}`} style={{ left: `${7.14 + point.col * 14.286}%`, top: `${7.14 + point.row * 14.286}%` }} aria-label={`${piece ? `${piece.side} piece` : "empty point"}${ASALTO_FORT.has(point.id) ? ", fortress" : ""}${legal.includes(point.id) ? ", legal destination" : ""}`}>{(piece || deploy) && <span className={piece ? `asalto-piece ${piece.side}` : "deploy-marker"} style={piece ? { backgroundImage: `url(${CLANS[piece.side === "officer" ? officerClan : rebelClan].portrait})`, "--piece": CLANS[piece.side === "officer" ? officerClan : rebelClan].color } as React.CSSProperties : undefined} />}</button>; })}</section>
      <aside className="rules-panel"><span className="eyebrow">ICEGATE BRIEFING</span><h2>The essentials</h2><ol><li><b>Rebels:</b> move closer to the fort; fill its nine points or trap both Wardens.</li><li><b>Wardens:</b> move freely and jump-capture; reduce the Rebels to eight.</li><li><b>Routes matter:</b> pieces move only on visible etched lines.</li><li><b>Required jumps:</b> follow the selected capture setting.</li></ol><button className="rulebook-link" onClick={() => setTab("rules")}>Open full rulebook →</button><div className="debug-box"><strong>Evidence label</strong><span>The base rules are documented; forced continuation of a capture chain is our explicit playability reconstruction.</span></div></aside></section>}
    {tab === "rules" && <section className="asalto-scroll"><div className="scroll-heading"><span className="eyebrow">FROST-SCROLL · ORIGINAL WORDING</span><h2>How to play Fortress Breakwater</h2><p>No dice, cards, currency, or hidden information. One action is chosen on each alternating turn.</p></div><div className="rule-grid">{ruleSections.map(([title, copy], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div><div className="edge-cases"><h3>Examples and edge cases</h3><ul><li>A diagonal jump is legal only where both halves of that diagonal are visibly etched.</li><li>A Rebel beside the fortress may enter only by a move that reduces its shortest route distance; once inside it may shift within the fort but cannot retreat out.</li><li>If two jumps are available, choose either. If the landing opens another jump, that same Warden continues.</li><li>A Warden cannot jump another Warden, land on an occupied point, turn during one jump, or pass.</li><li>In huffing mode, a non-capturing Warden move while any Warden has a jump removes the moved Warden before the Rebels' turn.</li></ul></div></section>}
    {tab === "research" && <section className="asalto-research"><header><span className="eyebrow">SOURCE LEDGER</span><h2>What history supports—and what we chose</h2><p>Asalto is a European fortress game of the Fox-and-Geese family, documented under several national names. It is traditional rather than ancient in the archaeological sense.</p></header><div className="evidence-grid"><article><span className="confirmed">CONFIRMED</span><h3>Material form</h3><p>Two players; a 33-point cross; a nine-point fortress; 24 attackers and two defenders. Attackers begin outside the fort and move first.</p></article><article><span className="supported">STRONGLY SUPPORTED</span><h3>Movement and victory</h3><p>Attackers move toward the fortress. Defenders move in any direction and jump-capture. Nine attackers in the fort or immobilized defenders gives the attack victory; eight attackers cannot fill the fort.</p></article><article><span className="uncertain">UNCERTAIN</span><h3>Origin and date</h3><p>Sources agree on European circulation and Fox-and-Geese ancestry, but disagree on whether Asalto itself begins in late-18th-century Germany or is chiefly a 19th-century/Victorian form.</p></article><article><span className="reconstructed">RECONSTRUCTED</span><h3>Digital adjudication</h3><p>Guided mandatory capture is the default. We require an available continuation after each jump, eliminate only at eight Rebels, and declare an immobile Rebel force a Warden win.</p></article><article><span className="variant">MODERN/KNOWN VARIANTS</span><h3>Other tables</h3><p>German Tactics restricts attacker use of marked horizontal lines. Royal Garrison enlarges the board and armies. Some rules place defenders on fixed points; others allow free fortress deployment.</p></article><article><span className="theme">ORIGINAL THEME</span><h3>Arctic Dominion layer</h3><p>“Wardens,” “Rebels,” icegate graphics, clan portraits, palette, copy, and UI are original presentation. They do not claim historical authenticity.</p></article></div><div className="source-list"><h3>Consulted sources</h3><a href="https://games.porg.es/games/assault/" target="_blank" rel="noreferrer">Ways to Play · Assault — cited historical works, licensed diagrams, variants</a><a href="https://sites.google.com/site/boardandpieces/list-of-games/asalto" target="_blank" rel="noreferrer">Board and Pieces · Asalto — setup, route-distance movement, huffing</a><a href="https://colecaomuseudesporto.ipdj.gov.pt/ficha.aspx?IPR=5652&id=3570&lang=po&ns=216000" target="_blank" rel="noreferrer">Museu do Desporto · Jogo do Assalto — surviving material object and rules description</a><a href="https://archive.org/details/chessinicelandin00fiskuoft/page/147" target="_blank" rel="noreferrer">Willard Fiske (1905) · Chess in Iceland — early comparative game-history reference</a></div><p className="license-note">Copyright note: the implementation draws facts and abstract mechanics from historical descriptions. It reproduces no modern board artwork, photographs, scans, diagrams, or rulebook prose.</p></section>}
  </main>;
}
