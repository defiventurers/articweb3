export function MainMenu(props) {
  return (
    <section className="screen">
      <div className="card">
        <h1>Artic Web3</h1>
        <button className="primary-btn" onClick={props.onPlay}>Start Game</button>
        <button className="secondary-btn" onClick={props.onHowToPlay}>Rules</button>
      </div>
    </section>
  );
}
