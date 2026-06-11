import { DepositPanel } from "../components/DepositPanel.jsx";

export function HighStakesScreen({ profile, onBack }) {
  return (
    <section className="screen">
      <div className="card">
        <h1>High Stakes</h1>

        <p className="note">
          {profile.name} · {profile.points} points
        </p>

        <DepositPanel />

        <p className="note">
          Risk crypto and compete for the prize pool.
        </p>

        <div className="rules-panel">
          <strong>Entry tiers</strong>
          <span>$1 · $4 · $16</span>
          <strong>Placement returns</strong>
          <span>1st: 3x entry + 100 points</span>
          <span>2nd: 1x entry + 100 points</span>
          <span>3rd: 0x entry + 100 points</span>
          <span>4th: 0x entry + 10 points</span>
        </div>

        <p className="error">
          High Stakes is locked until contracts, server-owned gameplay, and payout safety are ready.
        </p>

        <button className="secondary-btn" disabled>
          Create $1 Room Coming Soon
        </button>

        <button className="secondary-btn" disabled>
          Create $4 Room Coming Soon
        </button>

        <button className="secondary-btn" disabled>
          Create $16 Room Coming Soon
        </button>

        <button className="secondary-btn" onClick={onBack}>
          Back To Hub
        </button>
      </div>
    </section>
  );
}
