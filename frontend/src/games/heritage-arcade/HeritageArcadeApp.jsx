/* Arctic Dominion migration: native collection shell for Board Arcade’s preserved local engines. */
import { useMemo, useState } from "react";
import { ArcadeChainStatus } from "./ArcadeChainStatus.jsx";
import { ARCADE_GAMES, CATEGORIES } from "./ported/data/games.ts";
import { ALL_CLANS, CLANS } from "./ported/game/millsRules.ts";
import SanguoBoard from "./ported/components/SanguoBoard.tsx";
import XiangqiBoard from "./ported/components/XiangqiBoard.tsx";
import MillsBoard from "./ported/components/MillsBoard.tsx";
import CompactBoard from "./ported/components/CompactBoard.tsx";
import AttaqueBoard from "./ported/components/AttaqueBoard.tsx";
import HnefataflBoard from "./ported/components/HnefataflBoard.tsx";
import AsaltoBoard from "./ported/components/AsaltoBoard.tsx";
import ChaturajiBoard from "./ported/components/ChaturajiBoard.tsx";
import RyukyuSanzanBoard from "./ported/components/RyukyuSanzanBoard.tsx";
import "./ported/styles/heritage-arcade.css";

const compassMark = "/assets/heritage-arcade/board/ppba-compass-mark.png";
const visualReference = "/assets/heritage-arcade/board/ppba-arcade-reference.png";
const auditedTables = new Set([5, 19, 23, 25]);
const originalComplete = new Set([6, 7, 8, 10, 11, 13, 16, 20, 22]);

export function HeritageArcadeApp({ onExitToLibrary }) {
  const [selected, setSelected] = useState(ARCADE_GAMES[11]);
  const [category, setCategory] = useState("All routes");
  const [activeMode, setActiveMode] = useState(null);
  const [roster, setRoster] = useState(["polly", "retsba", "pengu"]);
  const filtered = useMemo(() => category === "All routes" ? ARCADE_GAMES : ARCADE_GAMES.filter((game) => game.category === category), [category]);
  const toggleClan = (clan) => setRoster((current) => current.includes(clan) ? current.length === 3 ? current : current.filter((id) => id !== clan) : [...current.slice(0, 2), clan]);
  const backToAtlas = () => setActiveMode(null);

  if (activeMode !== null) return renderBoard(activeMode, roster, backToAtlas);

  return <main className="atlas-shell heritage-arcade-shell">
    <aside className="atlas-rail">
      <button type="button" className="text-button heritage-back" onClick={onExitToLibrary}>← Arctic Kingdoms</button>
      <div className="brand-lockup"><img src={compassMark} alt="" /><div><span>ARCTIC DOMINION COLLECTION</span><strong>Heritage Board<br />Arcade</strong></div></div>
      <nav className="route-nav" aria-label="Heritage game categories"><span className="rail-label">PRESERVED ROUTES</span>{CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><i />{item}<small>{item === "All routes" ? ARCADE_GAMES.length : ARCADE_GAMES.filter((game) => game.category === item).length}</small></button>)}</nav>
      <section className="clan-ledger"><span className="rail-label">LOCAL TABLE ROSTER</span>{ALL_CLANS.map((id) => { const clan = CLANS[id]; const fielded = roster.includes(id); return <button type="button" key={id} onClick={() => toggleClan(id)} className={`clan-choice ${fielded ? "fielded" : ""}`} style={{ "--clan": clan.color }}><img src={clan.portrait} alt="" /><span><strong>{clan.name}</strong><small>{fielded ? "Fielded locally" : "Available for 3-clan tables"}</small></span><b>{fielded ? "IN" : "OUT"}</b></button>; })}</section>
      <p className="rail-footnote">Free Play is local and transaction-free. Wallet identity is optional and inherited from Arctic Dominion.</p>
    </aside>
    <section className="atlas-main">
      <header className="atlas-header"><div><span className="eyebrow">ARCTIC DOMINION · HERITAGE COLLECTION</span><h1>Preserve the rules.<br /><em>Command the ice.</em></h1></div><div className="header-tools"><div className="header-stats"><span><b>{ARCADE_GAMES.length}</b> tables loaded</span></div><ArcadeChainStatus /><button type="button" className="direct-play" onClick={() => { setSelected(ARCADE_GAMES[11]); setActiveMode(12); }}><span>✦</span> Play Penguin Mills</button></div></header>
      <section className="atlas-intro"><div><span className="eyebrow">CURRENT BRIEFING</span><h2>{selected.name} <em>— {selected.subtitle}</em></h2><p>{selected.loop}</p><div className="status-row"><span className={`status-tag ${selected.status.startsWith("Pudgy") ? "original" : selected.status.includes("Reconstruction") ? "reconstructed" : "documented"}`}>{selected.status}</span><span>{selected.players}</span><span>FREE PLAY · NO TRANSACTION</span></div></div><div className="brief-art"><img src={visualReference} alt="Icebound strategy atlas" /><span>HERITAGE TABLE {String(selected.id).padStart(2, "0")}</span></div></section>
      <section className="dossier-actions"><button type="button" className="primary-action" onClick={() => setActiveMode(selected.id)}>{selected.id === 12 ? "Open the featured ice table" : `Play ${selected.name}`}</button><button type="button" className="text-action" onClick={() => document.getElementById("heritage-briefing")?.scrollIntoView({ behavior: "smooth" })}>Read board briefing ↓</button></section>
      <section className="dossier-grid" aria-label="Heritage game tables">{filtered.map((game) => <button type="button" key={game.id} className={`dossier-card ${selected.id === game.id ? "selected" : ""} ${game.playable ? "featured" : ""}`} onClick={() => setSelected(game)}><span className="card-index">{String(game.id).padStart(2, "0")}</span><span className="card-category">{game.category}</span><h3>{game.name}</h3><p>{game.subtitle}</p><div><span>{game.players}</span><b>{auditedTables.has(game.id) ? "LIVE · AUDITED" : originalComplete.has(game.id) ? "LIVE · ORIGINAL" : "LIVE · RULES"}</b></div></button>)}</section>
      <section id="heritage-briefing" className="full-briefing"><div className="brief-number">{String(selected.id).padStart(2, "0")}</div><div className="brief-copy"><span className="eyebrow">BOARD BRIEFING</span><h2>{selected.name}: <em>{selected.subtitle}</em></h2><p>{selected.layout}</p><p>{selected.loop}</p><div className="brief-meta"><span><b>Seats</b>{selected.players}</span><span><b>Route</b>{selected.category}</span><span><b>Rule status</b>{selected.status}</span></div></div><aside><strong>ABSTRACT-READY PLAY</strong><p>Local moves remain off-chain. Connected Arctic Dominion profiles can be recognized now; match validation, contracts, and any testnet lock flow are deliberately deferred.</p><button type="button" onClick={() => setActiveMode(selected.id)}>Open table →</button></aside></section>
    </section>
  </main>;
}

function renderBoard(modeId, roster, onBack) {
  if (modeId === 1) return <SanguoBoard onBack={onBack} />;
  if (modeId === 25) return <XiangqiBoard onBack={onBack} />;
  if (modeId === 7) return <RyukyuSanzanBoard key={roster.join("-")} roster={roster} onBack={onBack} />;
  if (modeId === 12) return <MillsBoard key={roster.join("-")} roster={roster} onBack={onBack} />;
  if (modeId === 15) return <AttaqueBoard clans={roster} onBack={onBack} />;
  if (modeId === 18) return <HnefataflBoard roster={roster} onBack={onBack} />;
  if (modeId === 19) return <AsaltoBoard key={roster.join("-")} roster={roster} onBack={onBack} />;
  if (modeId === 5 || modeId === 23) return <ChaturajiBoard onBack={onBack} />;
  return <CompactBoard key={`${modeId}-${roster.join("-")}`} modeId={modeId} roster={roster} onBack={onBack} />;
}
