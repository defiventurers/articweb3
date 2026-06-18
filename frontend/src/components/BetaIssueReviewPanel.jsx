import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.issueReview.v1";
const DEFAULT_REVIEW = {
  title: "",
  severity: "Major",
  area: "Lock",
  status: "Open",
  cause: "",
  fix: "",
  prevention: "",
  owner: ""
};
const SEVERITIES = ["Blocker", "Major", "Minor", "Polish"];
const AREAS = ["Wallet", "Network", "Funding", "Room", "Lock", "Gameplay", "Settlement", "Indexer", "UX", "Mobile"];
const STATUSES = ["Open", "Investigating", "Fixed", "Retest passed", "Not reproducible"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaIssueReviewPanel() {
  const [review, setReview] = useState(() => loadReview());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(review)); } catch {}
  }, [review]);

  function update(key, value) {
    setReview((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setReview(DEFAULT_REVIEW);
    setCopyNote("");
  }

  async function copyReview() {
    const lines = [
      "Closed Beta Issue Review",
      `Title: ${review.title || "—"}`,
      `Severity: ${review.severity}`,
      `Area: ${review.area}`,
      `Status: ${review.status}`,
      `Owner: ${review.owner || "—"}`,
      `Cause: ${review.cause || "—"}`,
      `Fix: ${review.fix || "—"}`,
      `Prevention: ${review.prevention || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Issue review copied.");
    } catch {
      setCopyNote("Copy failed. Select the issue review manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Issue review</strong>
      <p className="data-subtitle">Capture the lesson from the most important beta issue before another tester wave.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Severity: {review.severity}</span>
        <span className="stat-chip">Status: {review.status}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Review</strong>
          <input style={inputStyle} value={review.title} onChange={(event) => update("title", event.target.value)} placeholder="Issue title" />
          <select style={inputStyle} value={review.severity} onChange={(event) => update("severity", event.target.value)}>
            {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
          </select>
          <select style={inputStyle} value={review.area} onChange={(event) => update("area", event.target.value)}>
            {AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <select style={inputStyle} value={review.status} onChange={(event) => update("status", event.target.value)}>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input style={inputStyle} value={review.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Owner" />
          <input style={inputStyle} value={review.cause} onChange={(event) => update("cause", event.target.value)} placeholder="Cause" />
          <input style={inputStyle} value={review.fix} onChange={(event) => update("fix", event.target.value)} placeholder="Fix" />
          <input style={inputStyle} value={review.prevention} onChange={(event) => update("prevention", event.target.value)} placeholder="Prevention" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyReview}>Copy Issue Review</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Issue Review</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadReview() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_REVIEW, ...parsed } : DEFAULT_REVIEW;
  } catch {
    return DEFAULT_REVIEW;
  }
}
