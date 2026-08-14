const themeScenes = {
  dominion: "fortress",
  fishflow: "river",
  tiger: "mountains",
  temple: "temple",
  vulture: "aurora",
  ganjifa: "palace"
};

export function GameEnvironment({ theme }) {
  const scene = themeScenes[theme] || "expedition";

  return (
    <div className={`arctic-environment arctic-environment--${scene}`} aria-hidden="true">
      <div className="arctic-environment__sky" />
      <div className="arctic-environment__aurora arctic-environment__aurora--one" />
      <div className="arctic-environment__aurora arctic-environment__aurora--two" />
      <div className="arctic-environment__stars" />
      <div className="arctic-environment__mountains arctic-environment__mountains--far" />
      <div className="arctic-environment__mountains arctic-environment__mountains--near" />
      <div className="arctic-environment__landmark" />
      <div className="arctic-environment__fog arctic-environment__fog--far" />
      <div className="arctic-environment__ice-shelf" />
      <div className="arctic-environment__fog arctic-environment__fog--near" />
      <div className="arctic-environment__ground" />
      <div className="arctic-environment__snow arctic-environment__snow--one" />
      <div className="arctic-environment__snow arctic-environment__snow--two" />
      <div className="arctic-environment__vignette" />
    </div>
  );
}
