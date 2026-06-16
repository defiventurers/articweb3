import { useMemo, useState } from "react";
import { StartingPositionsBoard } from "../components/StartingPositionsBoard.jsx";
import { TutorialBoard } from "../components/TutorialBoard.jsx";

const KINGDOMS = [
  {
    id: "retsba",
    name: "RETSBA",
    color: "red",
    image: "/assets/how-to-play/retsba-kingdom.png",
    emblem: "🔥",
    description: "Pressure the board early and hunt exposed Kings."
  },
  {
    id: "pengu",
    name: "PENGU",
    color: "blue",
    image: "/assets/how-to-play/pengu-kingdom.png",
    emblem: "❄️",
    description: "Balanced control, clean lanes, and beginner-friendly turns."
  },
  {
    id: "abster",
    name: "ABSTER",
    color: "green",
    image: "/assets/how-to-play/abster-kingdom.png",
    emblem: "🌌",
    description: "Tricky movement, ambush angles, and chaotic counterattacks."
  },
  {
    id: "polly",
    name: "POLLY",
    color: "pink",
    image: "/assets/how-to-play/polly-kingdom.png",
    emblem: "💎",
    description: "Survive pressure, protect the Crown, and strike late."
  }
];

const PIECES = [
  { icon: "👑", name: "Frost King", count: 1, rule: "Moves 1 tile in any direction. If captured, your kingdom falls." },
  { icon: "🚢", name: "Icebreaker", count: 1, rule: "Jumps exactly 2 tiles diagonally." },
  { icon: "🦣", name: "War Mammoth", count: 1, rule: "Moves straight across rows or columns." },
  { icon: "🦄", name: "Aurora Unicorn", count: 1, rule: "Moves in an L-shape and jumps over pieces." },
  { icon: "🐧", name: "Snow Guards", count: 4, rule: "Advance forward, capture diagonally, and guard your Crown." }
];

const CHAPTERS = [
  "Choose Kingdom",
  "Start Positions",
  "Try Pieces",
  "Roll Dice",
  "Capture Kings",
  "Start Battle"
];

const ROSTER_IMAGE = "/assets/how-to-play/dominion-pieces-roster.png";

export function HowToPlayScreen({ onBack, onStart }) {
  const [chapter, setChapter] = useState(0);
  const [selectedKingdom, setSelectedKingdom] = useState("retsba");
  const [failedImages, setFailedImages] = useState({});

  const activeKingdom = useMemo(() => {
    return KINGDOMS.find((kingdom) => kingdom.id === selectedKingdom) || KINGDOMS[0];
  }, [selectedKingdom]);

  const progress = `${((chapter + 1) / CHAPTERS.length) * 100}%`;

  function markImageFailed(src) {
    setFailedImages((current) => ({ ...current, [src]: true }));
  }

  function goNext() {
    setChapter((current) => Math.min(current + 1, CHAPTERS.length - 1));
  }

  function goBackChapter() {
    setChapter((current) => Math.max(current - 1, 0));
  }

  return (
    <section className="academy-screen" aria-label="Frost Academy how to play">
      <div className="academy-shell">
        <header className="academy-topbar">
          <button type="button" className="academy-back" onClick={onBack}>Menu</button>
          <div className="academy-brand">
            <span>Frost Academy</span>
            <strong>Learn Arctic Dominion</strong>
          </div>
          <button type="button" className="academy-skip" onClick={onStart || onBack}>Play</button>
        </header>

        <div className="academy-progress" aria-label="Tutorial progress">
          <span style={{ width: progress }} />
        </div>

        <nav className="academy-tabs" aria-label="Tutorial chapters">
          {CHAPTERS.map((label, index) => (
            <button
              type="button"
              key={label}
              className={index === chapter ? "active" : ""}
              onClick={() => setChapter(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>

        <main className="academy-card">
          <div className="academy-chapter-tag">Crown Shard {chapter + 1} / {CHAPTERS.length}</div>
          {chapter === 0 && (
            <ChooseKingdomChapter
              activeKingdom={activeKingdom}
              selectedKingdom={selectedKingdom}
              setSelectedKingdom={setSelectedKingdom}
              failedImages={failedImages}
              markImageFailed={markImageFailed}
            />
          )}
          {chapter === 1 && (
            <StartPositionsChapter
              failedImages={failedImages}
              markImageFailed={markImageFailed}
            />
          )}
          {chapter === 2 && <TryPiecesChapter activeKingdom={activeKingdom} />}
          {chapter === 3 && <DiceChapter activeKingdom={activeKingdom} />}
          {chapter === 4 && <CaptureKingsChapter />}
          {chapter === 5 && <WinDominionChapter onStart={onStart || onBack} />}
        </main>

        <footer className="academy-nav">
          <button type="button" className="academy-nav-btn" onClick={goBackChapter} disabled={chapter === 0}>Previous</button>
          <div className="academy-core-loop">Roll dice → tap piece → glow moves → capture King</div>
          {chapter < CHAPTERS.length - 1 ? (
            <button type="button" className="academy-nav-btn primary" onClick={goNext}>Next</button>
          ) : (
            <button type="button" className="academy-nav-btn primary" onClick={onStart || onBack}>Start Battle</button>
          )}
        </footer>
      </div>
    </section>
  );
}

function ChooseKingdomChapter({ activeKingdom, selectedKingdom, setSelectedKingdom, failedImages, markImageFailed }) {
  return (
    <div className="academy-two-col">
      <div className="academy-copy">
        <p className="academy-eyebrow">Step 1</p>
        <h1>Choose your frozen kingdom.</h1>
        <p>
          Four kingdoms enter from four sides of the battlefield. Pick a side,
          protect your Frost King, and prepare for a chaotic 4-player fight.
        </p>

        <div className={`academy-kingdom-profile ${activeKingdom.color}`}>
          <span>{activeKingdom.emblem}</span>
          <div>
            <strong>{activeKingdom.name}</strong>
            <p>{activeKingdom.description}</p>
          </div>
        </div>
      </div>

      <div className="kingdom-picker" aria-label="Choose kingdom preview">
        {KINGDOMS.map((kingdom) => (
          <button
            type="button"
            key={kingdom.id}
            className={`kingdom-preview ${kingdom.color} ${selectedKingdom === kingdom.id ? "active" : ""}`}
            onClick={() => setSelectedKingdom(kingdom.id)}
          >
            <ImageWithFallback
              src={kingdom.image}
              alt={`${kingdom.name} kingdom art`}
              fallback={kingdom.emblem}
              failedImages={failedImages}
              onFail={markImageFailed}
            />
            <span>{kingdom.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StartPositionsChapter({ failedImages, markImageFailed }) {
  return (
    <div className="academy-two-col start-positions-layout">
      <div className="academy-copy start-copy">
        <p className="academy-eyebrow">Step 2</p>
        <h1>Learn the battlefield.</h1>
        <p>
          All four teams start on the outside edges. The center stays open so the
          first fights happen quickly.
        </p>

        <div className="roster-frame roster-spotlight">
          <ImageWithFallback
            src={ROSTER_IMAGE}
            alt="Arctic Dominion full piece roster"
            fallback="👑"
            failedImages={failedImages}
            onFail={markImageFailed}
          />
          <p>Full army roster: 4 Snow Guards, Icebreaker, War Mammoth, Aurora Unicorn, and Frost King.</p>
        </div>
      </div>

      <StartingPositionsBoard />
    </div>
  );
}

function TryPiecesChapter({ activeKingdom }) {
  return (
    <div className="academy-two-col try-pieces-layout">
      <div className="academy-copy try-copy">
        <p className="academy-eyebrow">Step 3</p>
        <h1>Try every piece.</h1>
        <p>
          Select a Dominion piece, tap it on the board, then move it to a glowing tile.
          This is the fastest way to learn Arctic Dominion on mobile.
        </p>

        <div className="piece-stack compact-piece-stack">
          {PIECES.map((piece) => (
            <article className="piece-rule" key={piece.name}>
              <span>{piece.icon}</span>
              <div>
                <strong>{piece.count} {piece.name}</strong>
                <p>{piece.rule}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <TutorialBoard teamColor={activeKingdom.color} />
    </div>
  );
}

function DiceChapter({ activeKingdom }) {
  return (
    <div className="academy-two-col dice-layout dice-training-layout">
      <div className="academy-copy">
        <p className="academy-eyebrow">Step 4</p>
        <h1>Roll two Dominion Dice.</h1>
        <p>
          In a real match, both dice decide your active piece types. Roll, pick one
          matching piece, move it, then use the second die if possible.
        </p>

        <div className="dice-example-card">
          <div className="big-die">🎲🎲</div>
          <div>
            <strong>Roll → Move</strong>
            <p>The tray will dim pieces that are not active on your unused dice.</p>
          </div>
        </div>
      </div>

      <TutorialBoard teamColor={activeKingdom.color} diceMode />
    </div>
  );
}

function CaptureKingsChapter() {
  return (
    <div className="academy-two-col capture-layout">
      <div className="academy-copy">
        <p className="academy-eyebrow">Step 5</p>
        <h1>Capture Kings. Erase kingdoms.</h1>
        <p>
          Land on enemy pieces to capture them. Capture a Frost King and that
          kingdom disappears from the battlefield instantly.
        </p>

        <div className="capture-rules">
          <article>
            <span>⚔️</span>
            <strong>Capture</strong>
            <p>Move onto an enemy piece to remove it.</p>
          </article>
          <article>
            <span>👑</span>
            <strong>King falls</strong>
            <p>The player is eliminated when their King is captured.</p>
          </article>
          <article>
            <span>❌</span>
            <strong>No checkmate</strong>
            <p>No slow chess logic. This is survival elimination.</p>
          </article>
        </div>
      </div>

      <div className="king-capture-card">
        <div className="capture-scene">
          <span className="attacker">🦄</span>
          <span className="capture-arrow">→</span>
          <span className="target-king">👑</span>
        </div>
        <strong>Capture the King</strong>
        <p>Kingdom removed. Remaining kingdoms continue fighting.</p>
      </div>
    </div>
  );
}

function WinDominionChapter({ onStart }) {
  return (
    <div className="academy-finale">
      <p className="academy-eyebrow">Step 6</p>
      <h1>Last Crown standing wins.</h1>
      <p>
        Arctic Dominion is a strategy party battle: simple to start, chaotic to
        master, and built for fast multiplayer sessions.
      </p>

      <div className="win-loop-grid">
        <article><span>🎲</span><strong>Roll</strong><p>Dice chooses your options.</p></article>
        <article><span>🧊</span><strong>Move</strong><p>Glowing tiles show legal moves.</p></article>
        <article><span>⚔️</span><strong>Capture</strong><p>Remove enemies and hunt Kings.</p></article>
        <article><span>🏆</span><strong>Survive</strong><p>Last kingdom wins Dominion.</p></article>
      </div>

      <button type="button" className="academy-start-large" onClick={onStart}>Start Battle</button>
    </div>
  );
}

function ImageWithFallback({ src, alt, fallback, failedImages, onFail }) {
  const failed = failedImages[src];

  return (
    <div className="image-fallback-frame">
      {!failed && (
        <img
          src={src}
          alt={alt}
          draggable="false"
          onError={() => onFail(src)}
        />
      )}
      {failed && <div className="academy-image-fallback" aria-hidden="true">{fallback}</div>}
    </div>
  );
}
