import { OptimizedImage } from "../components/OptimizedImage.jsx";

export function CoverScreen({ onContinue, onBackToLibrary }) {
  return (
    <section className="art-screen" aria-label="Cover screen">
      <div className="art-stage">
        <OptimizedImage
          className="screen-art"
          src="/assets/screens/cover.png"
          desktopSrc="/assets/screens/cover-desktop.png"
          alt="Arctic Dominion cover"
          fetchPriority="high"
        />
        <button
          className="cover-continue-hitbox full-hitbox"
          onClick={onContinue}
          aria-label="Tap anywhere to continue"
        />
        {onBackToLibrary && (
          <button type="button" className="cover-library-button" onClick={onBackToLibrary}>
            ← All Games
          </button>
        )}
      </div>
    </section>
  );
}
