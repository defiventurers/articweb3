import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.evidencePacket.v1";
const DEFAULT_PACKET = {
  cycleId: "",
  roomCode: "",
  inviteLink: "",
  lockEventLink: "",
  settlementLink: "",
  historyLink: "",
  activityLink: "",
  recoveryNote: "",
  operatorNote: ""
};
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaEvidencePacketPanel() {
  const [packet, setPacket] = useState(() => loadPacket());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(packet)); } catch {}
  }, [packet]);

  function update(key, value) {
    setPacket((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setPacket(DEFAULT_PACKET);
    setCopyNote("");
  }

  async function copyPacket() {
    const lines = [
      "Closed Beta Evidence Packet",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Cycle id: ${packet.cycleId || "—"}`,
      `Room code: ${packet.roomCode || "—"}`,
      `Invite link: ${packet.inviteLink || "—"}`,
      `Lock event link: ${packet.lockEventLink || "—"}`,
      `Settlement link: ${packet.settlementLink || "—"}`,
      `Match history evidence: ${packet.historyLink || "—"}`,
      `Account activity evidence: ${packet.activityLink || "—"}`,
      `Recovery note: ${packet.recoveryNote || "—"}`,
      `Operator note: ${packet.operatorNote || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Evidence packet copied.");
    } catch {
      setCopyNote("Copy failed. Select the evidence manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Evidence packet</strong>
      <p className="data-subtitle">Capture public links and short notes that prove a beta cycle actually passed.</p>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Cycle evidence</strong>
          <input style={inputStyle} value={packet.cycleId} onChange={(event) => update("cycleId", event.target.value)} placeholder="Cycle id / date" />
          <input style={inputStyle} value={packet.roomCode} onChange={(event) => update("roomCode", event.target.value)} placeholder="Room code" />
          <input style={inputStyle} value={packet.inviteLink} onChange={(event) => update("inviteLink", event.target.value)} placeholder="Invite link" />
          <input style={inputStyle} value={packet.lockEventLink} onChange={(event) => update("lockEventLink", event.target.value)} placeholder="Lock event public link" />
          <input style={inputStyle} value={packet.settlementLink} onChange={(event) => update("settlementLink", event.target.value)} placeholder="Settlement public link" />
          <input style={inputStyle} value={packet.historyLink} onChange={(event) => update("historyLink", event.target.value)} placeholder="Match history evidence" />
          <input style={inputStyle} value={packet.activityLink} onChange={(event) => update("activityLink", event.target.value)} placeholder="Account activity evidence" />
          <input style={inputStyle} value={packet.recoveryNote} onChange={(event) => update("recoveryNote", event.target.value)} placeholder="Recovery drill note" />
          <input style={inputStyle} value={packet.operatorNote} onChange={(event) => update("operatorNote", event.target.value)} placeholder="Operator note" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyPacket}>Copy Evidence Packet</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Evidence Packet</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadPacket() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_PACKET, ...parsed } : DEFAULT_PACKET;
  } catch {
    return DEFAULT_PACKET;
  }
}
