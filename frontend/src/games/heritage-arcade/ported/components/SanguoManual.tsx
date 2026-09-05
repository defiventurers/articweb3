/** Sanguo tutorial: Xiangqi rules on three logical 5x9 sectors plus an explicit central junction. */
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Compass, Crown, Flag, Route, Shield, Swords } from "lucide-react";
import "@/sanguo-manual.css";

type Role = "king" | "guard" | "seer" | "rider" | "icebreaker" | "cannon" | "scout" | "runner";
const CHAPTERS = ["Three Kingdoms", "Logical field", "Try pieces", "Cross the delta", "Resolve armies", "Start battle"];
const roles: Record<Role, { name: string; symbol: string; count: string; movement: string; restriction: string; tip: string }> = {
  king: { name: "General", symbol: "♛", count: "1", movement: "One orthogonal point inside its 3×3 palace.", restriction: "May not leave the palace, move into check, or face another General on an open logical file.", tip: "Protect this coin: the final surviving General wins." },
  guard: { name: "Advisor", symbol: "✦", count: "2", movement: "One diagonal palace point.", restriction: "Always remains on the five-point palace X.", tip: "Use Advisors to close the General’s escape routes." },
  seer: { name: "Elephant", symbol: "◈", count: "2", movement: "Exactly two diagonal points through a clear midpoint.", restriction: "The elephant-eye midpoint must be empty; it does not cross a river.", tip: "Elephants anchor home-sector defense." },
  rider: { name: "Horse", symbol: "↟", count: "2", movement: "A Xiangqi L: 2×1 or 1×2 on logical coordinates.", restriction: "The adjacent horse-leg point in the long direction must be clear.", tip: "Horses turn corner pressure into forks." },
  icebreaker: { name: "Chariot", symbol: "◆", count: "2", movement: "Any distance orthogonally on a clear logical rank or file.", restriction: "Stops at the first coin. At a river boundary the file continues only through its explicit Sanguo continuation.", tip: "Long files are powerful only while they remain clear." },
  cannon: { name: "Cannon", symbol: "✹", count: "2", movement: "Moves like a Chariot when not capturing.", restriction: "A capture requires exactly one intervening screen on one uninterrupted logical ray.", tip: "The central junction can create surprise screen captures." },
  scout: { name: "Soldier", symbol: "•", count: "5", movement: "One point forward before crossing a river.", restriction: "After crossing, it also gains one-point sideways movement; it never retreats.", tip: "Soldiers open routes and deny palace exits." },
  runner: { name: "Bannerman", symbol: "⚑", count: "2 optional", movement: "Two clear orthogonal transit points, then one outward diagonal finish.", restriction: "Both transit points must be clear; it does not jump.", tip: "Wei Flag, Shu Fire, and Wu Wind are optional setup coins." },
};

export default function SanguoManual({ onBack }: { onBack: () => void }) {
  const [chapter, setChapter] = useState(0);
  const [role, setRole] = useState<Role>("rider");
  const active = useMemo(() => roles[role], [role]);
  const progress = `${((chapter + 1) / CHAPTERS.length) * 100}%`;
  const next = () => setChapter((value) => Math.min(value + 1, CHAPTERS.length - 1));
  const previous = () => setChapter((value) => Math.max(value - 1, 0));

  return <main className="sanguo-academy" aria-label="Sanguo Qi how to play">
    <div className="sanguo-academy-shell">
      <header className="sanguo-academy-topbar"><button type="button" onClick={onBack}><ArrowLeft size={15} /> Table</button><div><span><Compass size={14} /> Three Kingdoms Academy</span><strong>Learn Sanguo Qi</strong></div><button type="button" className="sanguo-academy-play" onClick={onBack}>Play</button></header>
      <div className="sanguo-academy-progress"><span style={{ width: progress }} /></div>
      <nav className="sanguo-academy-tabs" aria-label="How to play chapters">{CHAPTERS.map((label, index) => <button type="button" key={label} className={chapter === index ? "active" : ""} onClick={() => setChapter(index)}><span>{index + 1}</span>{label}</button>)}</nav>
      <section className="sanguo-academy-card"><p className="sanguo-academy-tag">FIELD LESSON {chapter + 1} / {CHAPTERS.length}</p>
        {chapter === 0 && <ThreeKingdoms />}
        {chapter === 1 && <SourceField />}
        {chapter === 2 && <PieceLab role={role} setRole={setRole} active={active} />}
        {chapter === 3 && <DeltaChapter />}
        {chapter === 4 && <ResolutionChapter />}
        {chapter === 5 && <FinalChapter onStart={onBack} />}
      </section>
      <footer className="sanguo-academy-nav"><button type="button" onClick={previous} disabled={chapter === 0}><ChevronLeft size={15} /> Previous</button><p>Logical Xiangqi move → Sanguo boundary rule → General-safety filter</p>{chapter < CHAPTERS.length - 1 ? <button type="button" className="primary" onClick={next}>Next <ChevronRight size={15} /></button> : <button type="button" className="primary" onClick={onBack}>Open field <Swords size={15} /></button>}</footer>
    </div>
  </main>;
}

function ThreeKingdoms() {
  return <div className="academy-grid intro"><div><p className="academy-eyebrow">Lesson 1</p><h1>Three kingdoms. Standard Xiangqi logic.</h1><p>Shu / Red begins. Play then moves counterclockwise to Wu / Green and Wei / Blue. Each army lives on its own logical 5×9 Xiangqi half-board. The artwork positions those logical intersections on the three-sided table but does not define movement.</p><div className="academy-faction-row"><article className="red"><b>SHU · RED</b><span>Moves first</span></article><article className="green"><b>WU · GREEN</b><span>Moves second</span></article><article className="blue"><b>WEI · BLUE</b><span>Moves third</span></article></div></div><div className="academy-callout-grid"><article><Crown /><strong>General</strong><p>Keep your General alive.</p></article><article><Route /><strong>Logical grid</strong><p>Movement comes from rank/file coordinates.</p></article><article><Flag /><strong>Optional banners</strong><p>Use them only in banner-enabled games.</p></article></div></div>;
}

function SourceField() {
  return <div className="academy-grid"><div><p className="academy-eyebrow">Lesson 2</p><h1>The picture renders the board. Coordinates define the rules.</h1><p>Each coloured kingdom is a logical 5×9 sector: five ranks and nine files. Chariots, Cannons, Horses, Elephants, Advisors, Generals, and Soldiers first use ordinary Xiangqi coordinate rules. Only a move that reaches a river boundary consults the small Sanguo continuation table.</p><div className="academy-rule-list"><p><b>1.</b> Compute the normal Xiangqi move inside the active sector.</p><p><b>2.</b> If it reaches rank 0, apply the explicitly mapped river continuation.</p><p><b>3.</b> Finally reject blockers, friendly landings, self-check, and flying-General positions.</p></div></div><div className="academy-source-board"><img src="/assets/heritage-arcade/board/source-ink-unbroken.png" alt="Game of Three Kingdoms board artwork" /><span className="node node-a" /><span className="node node-b" /><span className="node node-c" /><small>Artwork and node placement are presentation; rule geometry is logical.</small></div></div>;
}

function PieceLab({ role, setRole, active }: { role: Role; setRole: (role: Role) => void; active: typeof roles[Role] }) {
  return <div className="academy-piece-lab"><div className="academy-role-list"><p className="academy-eyebrow">Lesson 3 · Try every piece</p>{(Object.keys(roles) as Role[]).map((key) => <button type="button" key={key} className={role === key ? "active" : ""} onClick={() => setRole(key)}><b>{roles[key].symbol}</b><span><strong>{roles[key].name}</strong><small>{roles[key].count}</small></span><ChevronRight size={14} /></button>)}</div><article className="academy-role-detail"><p className="academy-eyebrow">{active.symbol} · {active.name.toUpperCase()}</p><h1>{active.movement}</h1><p>{active.restriction}</p><div className="academy-route-demo"><span className="route-origin">{active.symbol}</span><i className="r1" /><i className="r2" /><i className="r3" /><i className="r4" /><span className="route-target t1" /><span className="route-target t2" /><span className="route-target t3" /></div><p className="academy-tip"><b>Field tip.</b> {active.tip}</p><small>The practice picture is explanatory. In the live table, friendly blockers, screens, river restrictions, and General safety can remove a highlighted target.</small></article></div>;
}

function DeltaChapter() {
  return <div className="academy-grid"><div><p className="academy-eyebrow">Lesson 4</p><h1>The centre has one explicit three-way rule.</h1><p>Every non-central river file has exactly one paired continuation. L5 is different: its rank-0 endpoint is the three-way junction. From Red L5 you may continue into Blue L5 or Green L5; the same relationship is symmetric for the other kingdoms.</p><div className="academy-rule-list"><p><b>No visual inference.</b> The engine never guesses a path from line angles or pixels.</p><p><b>Choose one branch.</b> A straight move entering L5 selects one foreign continuation; it does not turn from that branch into the third kingdom during the same ray.</p><p><b>Blockers remain normal.</b> A coin before the junction blocks every branch; a coin on one foreign branch blocks only that branch.</p></div></div><div className="academy-delta"><span className="delta-blue">WEI L5</span><span className="delta-green">WU L5</span><span className="delta-red">SHU L5</span><i /><i /><i /><b>L5</b></div></div>;
}

function ResolutionChapter() {
  return <div className="academy-grid"><div><p className="academy-eyebrow">Lesson 5</p><h1>Checkmate removes a General. Resolve the army.</h1><p>Normal General safety rules apply: do not leave your General attacked or facing another General on an open logical file. If a kingdom is checkmated—or has no legal move in stalemate—the table pauses for a separate army-resolution turn.</p><div className="academy-resolution"><article><span>1</span><b>Seal the defeat</b><p>Checkmate or stalemate creates a visible pending resolution.</p></article><article><span>2</span><b>Resolve army</b><p>Remove the defeated General.</p></article><article><span>3</span><b>Appropriate</b><p>The victor controls surviving coins while their original sector colour remains visible.</p></article></div></div><div className="academy-win"><Shield /><h2>Last surviving General wins.</h2><p>Appropriated coins move on the victor’s future turns but retain their original-sector restrictions where a piece rule requires them.</p></div></div>;
}

function FinalChapter({ onStart }: { onStart: () => void }) {
  return <div className="academy-finale-card"><p className="academy-eyebrow">Lesson 6</p><h1>Think Xiangqi first. Apply Sanguo only at the boundary.</h1><p>Select a piece, calculate its normal logical Xiangqi move, apply a river continuation only if necessary, then let the General-safety filter determine the final legal destinations.</p><div className="academy-loop"><article><Route /><b>Calculate</b><span>Use the local 5×9 coordinates.</span></article><article><Compass /><b>Cross</b><span>Apply an explicit river exit only at rank 0.</span></article><article><Swords /><b>Validate</b><span>Check blockers, captures, and General safety.</span></article><article><Crown /><b>Survive</b><span>Keep the last General standing.</span></article></div><button type="button" onClick={onStart}>Open the field</button></div>;
}
