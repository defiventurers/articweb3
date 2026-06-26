import { OptimizedImage } from "../components/OptimizedImage.jsx";

const screenStyle = {
  position: "fixed",
  inset: 0,
  width: "100vw",
  height: "100dvh",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  background: "#061b3a",
  zIndex: 1
};

const stageStyle = {
  position: "relative",
  width: "min(100vw, calc(100dvh * 9 / 16))",
  height: "min(100dvh, calc(100vw * 16 / 9))",
  maxWidth: "100vw",
  maxHeight: "100dvh",
  aspectRatio: "9 / 16",
  margin: 0,
  padding: 0,
  border: 0,
  borderRadius: 0,
  display: "block",
  overflow: "hidden",
  background: "#061b3a",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent"
};

const imageStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "fill",
  objectPosition: "center center",
  userSelect: "none",
  pointerEvents: "none",
  border: 0,
  margin: 0,
  padding: 0
};

export function CoverScreen({ onContinue }) {
  return (
    <section className="art-screen" style={screenStyle} aria-label="Cover screen">
      <button className="art-stage full-hitbox" style={stageStyle} onClick={onContinue} aria-label="Tap anywhere to continue">
        <OptimizedImage
          className="screen-art"
          style={imageStyle}
          src="/assets/screens/cover.png"
          alt="Artic Web3 cover"
          fetchPriority="high"
        />
      </button>
    </section>
  );
}
