const SNOW_FLAKES = Array.from({ length: 36 }, (_, index) => index);

export function ArcticAmbient({ reducedMotion = false }) {
  return (
    <div className={`arctic-ambient ${reducedMotion ? "reduce-motion" : ""}`} aria-hidden="true">
      <div className="ambient-night" />
      <div className="ambient-stars" />
      <div className="ambient-aurora aurora-left" />
      <div className="ambient-aurora aurora-right" />
      <div className="ambient-mountains mountain-back" />
      <div className="ambient-mountains mountain-front" />
      <div className="ambient-fog fog-one" />
      <div className="ambient-fog fog-two" />
      <div className="ambient-river" />
      <div className="ambient-lake" />
      <div className="ambient-citadel">
        <span className="citadel-tower tower-left" />
        <span className="citadel-tower tower-center" />
        <span className="citadel-tower tower-right" />
        <span className="citadel-gate" />
      </div>
      <div className="ambient-temple"><span /><span /><span /></div>
      <div className="ambient-village village-left"><i /><i /><i /></div>
      <div className="ambient-village village-right"><i /><i /><i /></div>
      <div className="ambient-campfire"><span /><span /><span /></div>
      <div className="ambient-crystals crystals-left"><i /><i /><i /></div>
      <div className="ambient-crystals crystals-right"><i /><i /><i /></div>
      <div className="ambient-inhabitants">
        <img src="/assets/artic/pieces/blue-icebreaker.webp" alt="" />
        <img src="/assets/artic/pieces/red-snow-guard.webp" alt="" />
        <img src="/assets/artic/pieces/green-frost-king.webp" alt="" />
        <img src="/assets/artic/pieces/pink-aurora-unicorn.webp" alt="" />
      </div>
      <div className="ambient-snowfield" />
      <div className="ambient-snowfall">
        {SNOW_FLAKES.map((flake) => (
          <span
            key={flake}
            style={{
              "--snow-index": flake,
              "--snow-left": `${(flake * 29) % 100}%`,
              "--snow-top": `${(flake * 13) % 100}%`,
              "--snow-drift": `${((flake % 5) - 2) * 17}px`
            }}
          />
        ))}
      </div>
    </div>
  );
}
