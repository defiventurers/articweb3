export function CoverScreen({ onContinue }) {
  return (
    <section className="screen">
      <button className="cover-screen" onClick={onContinue}>
        <div>
          <h1>Artic Web3</h1>
          <p>Tap to continue</p>
        </div>
      </button>
    </section>
  );
}
