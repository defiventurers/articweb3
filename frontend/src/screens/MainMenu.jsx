import { OptimizedImage } from "../components/OptimizedImage.jsx";

export function MainMenu(props) {
  return (
    <section className="art-screen" aria-label="Main menu">
      <div className="art-stage">
        <OptimizedImage
          className="screen-art"
          src="/assets/screens/main-menu.png"
          alt="Artic Web3 main menu"
          fetchPriority="high"
        />
        <button className="menu-hitbox menu-play-hitbox" aria-label="Start Game" onClick={props.onPlay} />
        <button className="menu-hitbox menu-how-hitbox" aria-label="Rules" onClick={props.onHowToPlay} />
        <button className="menu-hitbox menu-spectate-hitbox" aria-label="Spectate Room" onClick={props.onSpectate}>
          Spectate Room
        </button>
      </div>
    </section>
  );
}
