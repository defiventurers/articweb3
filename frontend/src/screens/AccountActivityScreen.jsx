export function AccountActivityScreen({ onBack }) {
  return (
    <section className="screen">
      <div className="card">
        <h1>Account Activity</h1>
        <p className="note">Activity records will appear here.</p>
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}
