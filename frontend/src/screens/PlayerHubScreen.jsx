import { DepositPanel } from "../components/DepositPanel.jsx";

export function PlayerHubScreen({ profile, onOpenIce, onHighStakes, onBack }) {
  return (
    <section className="screen">
      <div className="card">
        <h1>Player Hub</h1>

        <p className="note">
          {profile.name} · {profile.points} points
        </p>

        <DepositPanel />

        <button className="mode-choice active" onClick={onOpenIce}>
          <strong>Open Ice</strong>
          <span>Play freely with no crypto required.</span>
        </button>

        <button className="mode-choice" onClick={onHighStakes}>
          <strong>High Stakes</strong>
          <span>Risk crypto and compete for the prize pool.</span>
        </button>

        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
