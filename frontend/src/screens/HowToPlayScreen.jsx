import { useMemo, useState } from "react";

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
  { icon: "🚢", name: "Icebreaker", count: 1, rule: "Controls straight ice lanes and punishes open files." },
  { icon: "🦣", name: "War Mammoth", count: 1, rule: "Heavy tactical piece for power moves and board pressure." },
  { icon: "🦄", name: "Aurora Unicorn", count: 1, rule: "Jumps in surprise angles and creates chaos." },
  { icon: "🐧", name: "Snow Guards", count: 4, rule: "Advance forward, capture diagonally, and guard your Crown." }
];

const DICE_FACES = [
  { face: "1", icon: "🐧 / 👑", title: "Guard or King" },
  { face: "2", icon: "🦣", title: "War Mammoth" },
  { face: "3", icon: "🦄", title: "Aurora Unicorn" },
  { face: "4", icon: "🚢", title: "Icebreaker" },
  { face: "5", icon: "🐧 / 👑", title: "Guard or King" },
  { face: "6", icon: "🚢", title: "Icebreaker" }
];

const CHAPTERS = [
  "Choose Kingdom",
  "Command Pieces",
  "Roll Dice",
  "Move on Ice",
  "Capture Kings",
  "Win Dominion"
];

const ROSTER_IMAGE = "/assets/how-to-play/dominion-pieces-roster.png";

export function HowToPlayScreen({ onBack, onStart }) {
  const [chapter, setChapter] = useState(0);
  const [selectedKingdom, setSelectedKingdom] = useState("retsba");
  const [failedImages, setFailedImages] = useState({});
  const [drillStep, setDrillStep] = useState(0);

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
          {chapter === 1 && <CommandPiecesChapter failedImages={failedImages} markImageFailed={markImageFailed} />}
          {chapter === 2 && <DiceChapter />}
          {chapter === 3 && <MoveOnIceChapter drillStep={drillStep} setDrillStep={setDrillStep} />}
          {chapter === 4 && <CaptureKingsChapter />}
          {chapter === 5 && <WinDominionChapter onStart={onStart || onBack} />}
        </main>

        <footer className="academy-nav">
          <button type="button" className="academy-nav-btn" onClick={goBackChapter} disabled={chapter === 0}>Previous</button>
          <div className="academy-core-loop">Roll → Move glowing piece → Capture Kings → Survive</div>
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

function CommandPiecesChapter({ failedImages, markImageFailed }) {
  return (
    <div className="academy-two-col roster-layout">
      <div className="academy-copy">
        <p className="academy-eyebrow">Step 2</p>
        <h1>Command 8 Dominion pieces.</h1>
        <p>
          Each kingdom starts with the same army. The army is small on purpose:
          faster turns, less confusion, and more direct combat.
        </p>

        <div className="piece-stack">
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

      <div className="roster-frame">
        <ImageWithFallback
          src={ROSTER_IMAGE}
          alt="Arctic Dominion full piece roster"
          fallback="👑"
          failedImages={failedImages}
          onFail={markImageFailed}
        />
        <p>Upload the roster image here later. The layout already supports it.</p>
      </div>
    </div>
  );
}

function DiceChapter() {
  return (
    <div className="academy-two-col dice-layout">
      <div className="academy-copy">
        <p className="academy-eyebrow">Step 3</p>
        <h1>Roll the Dominion Dice.</h1>
        <p>
          The dice awakens which piece type can move this turn. That is what
          makes Arctic Dominion more chaotic and replayable than chess.
        </p>

        <div className="dice-example-card">
          <div className="big-die">🦄</div>
          <div>
            <strong>Roll Unicorn</strong>
            <p>Move one Aurora Unicorn. If no safe attack exists, reposition for the next turn.</p>
          </div>
        </div>
      </div>

      <div className="dice-grid" aria-label="Dominion Dice faces">
        {DICE_FACES.map((face) => (
          <article className="dice-face-card" key={`${face.face}-${face.title}`}>
            <span className="dice-number">{face.face}</span>
            <strong>{face.icon}</strong>
            <p>{face.title}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function MoveOnIceChapter({ drillStep, setDrillStep }) {
  const drillText = [
    "Tap Roll Dice. The Dominion Dice awakens a piece type.",
    "The Unicorn is awake. Select it.",
    "Glowing ice shows where the selected piece can move.",
    "Move to the capture tile and threaten the enemy Crown."
  ][drillStep];

  return (
    <div className="academy-two-col drill-layout">
      <div className="academy-copy">
        <p className="academy-eyebrow">Step 4</p>
        <h1>Move on glowing ice.</h1>
        <p>
          Players should not memorize everything on turn one. The board teaches
          them: select a piece, then move to a highlighted tile.
        </p>

        <div className="drill-panel">
          <strong>Mini Frost Drill</strong>
          <p>{drillText}</p>
          <div className="drill-actions">
            <button type="button" onClick={() => setDrillStep(1)} disabled={drillStep > 0}>Roll Dice</button>
            <button type="button" onClick={() => setDrillStep(2)} disabled={drillStep < 1 || drillStep > 2}>Select Unicorn</button>
            <button type="button" onClick={() => setDrillStep(3)} disabled={drillStep < 2}>Move</button>
            <button type="button" onClick={() => setDrillStep(0)}>Reset</button>
          </div>
        </div>
      </div>

      <MiniBoard drillStep={drillStep} />
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

function MiniBoard({ drillStep }) {
  const cells = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const key = `${row}-${col}`;
      let label = "";
      let className = "academy-mini-cell";

      if (row === 5 && col === 2) {
        label = "🦄";
        className += drillStep >= 1 ? " awake" : "";
        className += drillStep >= 2 ? " selected" : "";
      }

      const legalTiles = [[3, 1], [3, 3], [4, 4], [6, 4], [7, 1], [7, 3]];
      if (drillStep >= 2 && legalTiles.some(([r, c]) => r === row && c === col)) {
        className += " legal";
      }

      if (row === 3 && col === 3) {
        label = drillStep >= 3 ? "🦄" : "👑";
        className += drillStep >= 2 ? " capture" : "";
      }

      cells.push(<div className={className} key={key}>{label}</div>);
    }
  }

  return (
    <div className="academy-mini-board-wrap">
      <div className="academy-mini-board" aria-label="Mini tutorial board">
        {cells}
      </div>
      <div className="mini-board-legend">
        <span><i className="legend-dot legal" /> Legal move</span>
        <span><i className="legend-dot capture" /> Capture target</span>
      </div>
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
