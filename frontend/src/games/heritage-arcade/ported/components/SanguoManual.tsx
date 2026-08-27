/** Source-rail tutorial: Arctic Dominion-style chapters, preserving the approved Sanguo field rules. */
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Compass, Crown, Flag, Route, Shield, Swords } from "lucide-react";
import "@/sanguo-manual.css";

type Role = "king" | "guard" | "seer" | "rider" | "icebreaker" | "cannon" | "scout" | "runner";
const CHAPTERS = ["Three Kingdoms", "Source field", "Try pieces", "Cross the delta", "Resolve armies", "Start battle"];
const roles: Record<Role, { name: string; symbol: string; count: string; movement: string; restriction: string; tip: string }> = {
  king: { name: "General", symbol: "♛", count: "1", movement: "One orthogonal source-rail edge inside its palace.", restriction: "May not leave the palace or face another General across an open source rail.", tip: "Protect this coin: the final surviving General wins." },
  guard: { name: "Advisor", symbol: "✦", count: "2", movement: "One diagonal palace edge.", restriction: "Always remains within the three-by-three palace graph.", tip: "Use Advisors to close the General’s escape routes." },
  seer: { name: "Elephant", symbol: "◈", count: "2", movement: "Two diagonal graph edges through a clear midpoint.", restriction: "The midpoint must be empty; it does not cross a river arm.", tip: "Elephants anchor home-sector defense." },
  rider: { name: "Horse", symbol: "↟", count: "2", movement: "One orthogonal edge, then one outward diagonal edge.", restriction: "The first orthogonal leg must be clear; it never jumps.", tip: "Horses turn corner pressure into forks." },
  icebreaker: { name: "Chariot", symbol: "◆", count: "2", movement: "Any number of continuous, straight source-rail edges.", restriction: "Stops at the first coin; it may capture an enemy there. Cross-sector continuation exists only at marked delta edges.", tip: "Long rails are powerful only while they remain clear." },
  cannon: { name: "Cannon", symbol: "✹", count: "2", movement: "Moves like a Chariot when not capturing.", restriction: "To capture, exactly one coin must screen the target on one uninterrupted rail ray.", tip: "The central delta can create surprise screen captures." },
  scout: { name: "Soldier", symbol: "•", count: "5", movement: "One forward source-rail edge before crossing a river.", restriction: "After crossing, it may also use one sideways edge; it never retreats.", tip: "Soldiers open routes and deny palace exits." },
  runner: { name: "Bannerman", symbol: "⚑", count: "2 optional", movement: "Two orthogonal edges, then one outward diagonal edge.", restriction: "Every intervening edge must be clear; it does not jump.", tip: "Wei Flag, Shu Fire, and Wu Wind are optional setup coins." },
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
      <header className="sanguo-academy-topbar"><button type="button" onClick={onBack}><ArrowLeft size={15} /> Table</button><div><span><Compass size={14} /> Source Field Academy</span><strong>Learn Sanguo Qi</strong></div><button type="button" className="sanguo-academy-play" onClick={onBack}>Play</button></header>
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
      <footer className="sanguo-academy-nav"><button type="button" onClick={previous} disabled={chapter === 0}><ChevronLeft size={15} /> Previous</button><p>Inspect rails → select an active coin → land only on glowing graph nodes</p>{chapter < CHAPTERS.length - 1 ? <button type="button" className="primary" onClick={next}>Next <ChevronRight size={15} /></button> : <button type="button" className="primary" onClick={onBack}>Open field <Swords size={15} /></button>}</footer>
    </div>
  </main>;
}

function ThreeKingdoms() {
  return <div className="academy-grid intro"><div><p className="academy-eyebrow">Lesson 1</p><h1>Three kingdoms. One source field.</h1><p>Shu / Red begins. Play then moves counterclockwise to Wu / Green and Wei / Blue. The source setup uses sixteen standard coins per kingdom: nine major coins on the home edge, five Soldiers, and two Cannons.</p><div className="academy-faction-row"><article className="red"><b>SHU · RED</b><span>Moves first</span></article><article className="green"><b>WU · GREEN</b><span>Moves second</span></article><article className="blue"><b>WEI · BLUE</b><span>Moves third</span></article></div></div><div className="academy-callout-grid"><article><Crown /><strong>General</strong><p>Keep your General alive.</p></article><article><Route /><strong>Source rails</strong><p>Every legal destination is a real field node.</p></article><article><Flag /><strong>Optional banners</strong><p>Use them only in banner-enabled games.</p></article></div></div>;
}

function SourceField() {
  return <div className="academy-grid"><div><p className="academy-eyebrow">Lesson 2</p><h1>Read the actual field, not a square grid.</h1><p>The table is a 135-node source field. Coins sit on intersections. Each glowing node is calculated through its role’s own palace, river, blocker, capture, and General-safety rule, then checked against the approved source-node map.</p><div className="academy-rule-list"><p><b>1.</b> Select a coin controlled by the active kingdom.</p><p><b>2.</b> Follow only cyan legal nodes, never empty space.</p><p><b>3.</b> Land on an enemy coin only when that role’s capture rule permits it.</p></div></div><div className="academy-source-board"><img src="/assets/heritage-arcade/board/source-ink-unbroken.png" alt="Traced Game of Three Kingdoms source rails" /><span className="node node-a" /><span className="node node-b" /><span className="node node-c" /><small>White field, black rails, fixed graph nodes.</small></div></div>;
}

function PieceLab({ role, setRole, active }: { role: Role; setRole: (role: Role) => void; active: typeof roles[Role] }) {
  return <div className="academy-piece-lab"><div className="academy-role-list"><p className="academy-eyebrow">Lesson 3 · Try every piece</p>{(Object.keys(roles) as Role[]).map((key) => <button type="button" key={key} className={role === key ? "active" : ""} onClick={() => setRole(key)}><b>{roles[key].symbol}</b><span><strong>{roles[key].name}</strong><small>{roles[key].count}</small></span><ChevronRight size={14} /></button>)}</div><article className="academy-role-detail"><p className="academy-eyebrow">{active.symbol} · {active.name.toUpperCase()}</p><h1>{active.movement}</h1><p>{active.restriction}</p><div className="academy-route-demo"><span className="route-origin">{active.symbol}</span><i className="r1" /><i className="r2" /><i className="r3" /><i className="r4" /><span className="route-target t1" /><span className="route-target t2" /><span className="route-target t3" /></div><p className="academy-tip"><b>Field tip.</b> {active.tip}</p><small>The practice picture is explanatory. In the live table, friendly blockers, screens, river restrictions, and General safety can remove a highlighted target.</small></article></div>;
}

function DeltaChapter() {
  return <div className="academy-grid"><div><p className="academy-eyebrow">Lesson 4</p><h1>Reach the delta. Choose a legal branch.</h1><p>The three river arms meet at the central delta. A Chariot can continue from one named delta endpoint into the directly connected foreign file when it is clear. A Cannon can use the same direct hop only when it is empty; every Cannon capture still needs exactly one screen on one continuous rail line. No piece teleports between sectors.</p><div className="academy-rule-list"><p><b>Chariot</b> continues a clear straight ray and stops at the first coin.</p><p><b>Cannon</b> slides through an empty delta hop; its captures always require one screen.</p><p><b>All others</b> remain in their own source field unless a separate role rule says otherwise.</p></div></div><div className="academy-delta"><span className="delta-blue">WEI</span><span className="delta-green">WU</span><span className="delta-red">SHU</span><i /><i /><i /><b>DELTA</b></div></div>;
}

function ResolutionChapter() {
  return <div className="academy-grid"><div><p className="academy-eyebrow">Lesson 5</p><h1>Checkmate removes a General. Resolve the army.</h1><p>Normal General safety rules apply: do not leave your General attacked or facing another General on an open source rail. If a kingdom is checkmated—or has no legal move in stalemate—the table pauses for a separate army-resolution turn.</p><div className="academy-resolution"><article><span>1</span><b>Seal the defeat</b><p>Checkmate or stalemate creates a visible pending resolution.</p></article><article><span>2</span><b>Resolve army</b><p>Remove the defeated General.</p></article><article><span>3</span><b>Appropriate</b><p>The victor controls surviving coins while their original sector colour remains visible.</p></article></div></div><div className="academy-win"><Shield /><h2>Last surviving General wins.</h2><p>Appropriated coins move on the victor’s future turns but remain visibly part of their original kingdom.</p></div></div>;
}

function FinalChapter({ onStart }: { onStart: () => void }) {
  return <div className="academy-finale-card"><p className="academy-eyebrow">Lesson 6</p><h1>Chart a route. Claim the three kingdoms.</h1><p>Use the live field to select a piece, inspect only graph-legal destination nodes, move once, then pass play counterclockwise. The Node IDs control is available whenever you want to inspect the 135 fixed source points.</p><div className="academy-loop"><article><Route /><b>Select</b><span>Choose an active coin.</span></article><article><Compass /><b>Trace</b><span>Follow the glowing rail nodes.</span></article><article><Swords /><b>Resolve</b><span>Move, capture, or finish the army resolution.</span></article><article><Crown /><b>Survive</b><span>Keep the last General standing.</span></article></div><button type="button" onClick={onStart}>Open the source field</button></div>;
}
