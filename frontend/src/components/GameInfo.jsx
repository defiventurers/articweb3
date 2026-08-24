/* Tactile Expedition Theatre: this is the heritage-only invitation layer; it describes a first decision without changing any game rule. */
const EXPEDITION_BRIEFS = {
  "nine-ice-forts": "Build pressure between three points before you rush a mill.",
  "four-wing-ice-hunt": "Trace the lattice first; every open wing changes the hunt.",
  fishflow: "Follow the final fish: the last cup writes the next current.",
  "break-the-ice": "A clean cowrie cast is only useful when the route stays safe.",
  "ice-hunters": "Predators leap. Defenders close space. Read which role is yours.",
  "sixteen-ice-warriors": "Find one honest step before you look for the long capture chain.",
  "glacier-trail": "Count the protected houses before you spend a stored throw.",
  "crown-run": "Keep the royal route clear; one capture can turn the whole court.",
  "forty-glacier-guards": "Start with the clearest lane—the formation reveals itself move by move.",
  "sky-temple-run": "Learn the route in order: circuit, bridge, then temple climb.",
  "ice-rings": "Choose a clear source and follow the highlighted ring.",
  "cowrie-kingdoms": "Keep the centre in view while your runners circle the cloth map.",
  "two-stones": "Five points are enough for a complete blockade—leave no loose gap.",
  "aurora-vulture": "Protect the flock’s routes while the hunter searches the star.",
  "khasi-fishflow": "The final stone decides the next current; sow with patience.",
  "seven-ice-rings": "A forced start is a clue. Let the shared circles reveal it.",
  "ruma-ice-puzzle": "There is no rush: a safe relay finds its way to the Ruma.",
  "polar-tablan": "The route folds back. Check the row before you allocate the score.",
  sige: "The outer and inner routes meet at a centre with its own rule.",
  "aurora-ganjifa-academy": "Read the active suit and the current trick before you commit a card."
};

export function GameInfo({ game, index, total, onEnter }) {
  const playable = Boolean(game.available);
  const isArcticDominion = game.id === "arctic-dominion";
  const expeditionBrief = EXPEDITION_BRIEFS[game.id] || "Study the board shape, then take one deliberate first move.";

  return (
    <section className="game-info" aria-label={`Details for ${game.title}`}>
      <div className="game-info__counter">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
      <div className="game-info__title-row">
        <p className="game-info__eyebrow">ARCTIC GAME KINGDOMS</p>
        <span className={`game-info__status ${playable ? "is-playable" : "is-upcoming"}`}>{playable ? "PLAYABLE NOW" : "COMING SOON"}</span>
      </div>
      <h1>{game.title}</h1>
      <p className="game-info__heritage">{game.heritage}</p>
      <p className="game-info__metadata">{game.players.toUpperCase()} <span>·</span> {game.engine.toUpperCase()}</p>
      <p className="game-info__summary">{game.summary}</p>
      {!isArcticDominion && <div className="game-info__brief">
        <span>EXPEDITION BRIEF</span>
        <strong>{expeditionBrief}</strong>
      </div>}
      <button
        type="button"
        className={`game-info__action ${playable ? "is-playable" : "is-upcoming"}`}
        onClick={playable ? onEnter : undefined}
        disabled={!playable}
        aria-describedby={!playable ? "coming-soon-note" : undefined}
      >
        {playable ? (isArcticDominion ? "ENTER KINGDOM" : "ENTER BOARD") : "COMING SOON"} <span aria-hidden="true">→</span>
      </button>
      {!playable && <span id="coming-soon-note" className="game-info__coming-note">This kingdom is not playable yet.</span>}
    </section>
  );
}
