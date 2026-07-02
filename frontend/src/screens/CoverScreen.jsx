import { OptimizedImage } from "../components/OptimizedImage.jsx";

export function CoverScreen({ onContinue }) {
  return (
    <section className="art-screen" aria-label="Cover screen">
      <button className="art-stage full-hitbox" onClick={onContinue} aria-label="Tap anywhere to continue">
        <OptimizedImage
          className="screen-art"
          src="/assets/screens/cover.png"
          desktopSrc="/assets/screens/cover-desktop.png"
          alt="Artic Web3 cover"
          fetchPriority="high"
        />
      </button>
    </section>
  );
}
