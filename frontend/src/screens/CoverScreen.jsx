export function CoverScreen({ onContinue }) {
  return (
    <section className="art-screen" aria-label="Cover screen">
      <button className="art-stage full-hitbox" onClick={onContinue} aria-label="Tap anywhere to continue">
        <img
          className="screen-art"
          src="/assets/screens/cover.png"
          alt="Artic Web3 cover"
          draggable="false"
          decoding="async"
          fetchPriority="high"
        />
      </button>
    </section>
  );
}
