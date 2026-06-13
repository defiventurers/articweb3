export function MainMenu(props) {
  return (
    <section className="art-screen" aria-label="Main menu">
      <div className="art-stage">
        <img className="screen-art" src="/assets/screens/main-menu.png" alt="Artic Web3 main menu" draggable="false" />
        <button className="menu-hitbox menu-play-hitbox" aria-label="Start Game" onClick={props.onPlay} />
        <button className="menu-hitbox menu-how-hitbox" aria-label="Rules" onClick={props.onHowToPlay} />
        <button
          aria-label="Spectate Room"
          onClick={props.onSpectate}
          style={{
            position: "absolute",
            left: "50%",
            bottom: "5%",
            transform: "translateX(-50%)",
            zIndex: 4,
            border: "1px solid rgba(190,245,255,.78)",
            borderRadius: "999px",
            padding: "12px 22px",
            background: "rgba(6,35,70,.76)",
            color: "white",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          Spectate Room
        </button>
      </div>
    </section>
  );
}
