/* Arctic Dominion experience note: this compact guide offers a calm, honest first-action cue on every game route without interrupting play or changing rules. */
import { useState } from "react";
import { RecurringCharacter } from "./RecurringCharacter.jsx";

const GAME_BRIEFS = Object.freeze({
  "nine-ice-forts": { label: "Nine Ice Forts", cue: "Build a line of pressure between the forts; a clear bridge is worth more than a rushed move.", action: "New here? Open How to Play, then choose a practice game." },
  "four-wing-ice-hunt": { label: "Four-Wing Ice Hunt", cue: "Read the lattice first: the colony seals paths while the leopard searches for a leap.", action: "Choose Practice to learn one legal turn before facing the full hunt." },
  "aurora-ganjifa-academy": { label: "Aurora Ganjifa Academy", cue: "Notice the active suit and current trick before committing a card.", action: "Open How to Play for one illustrated trick before dealing in." },
  "aurora-vulture": { label: "Aurora Vulture", cue: "Keep the flock’s safe routes visible while watching the hunter’s pressure lanes.", action: "Use Practice to try a short opening without a room timer." },
  "break-the-ice": { label: "Break the Ice", cue: "Cowrie value, safe space, then exact finish: take the route one decision at a time.", action: "Try the drill for a guided exact-finish throw." },
  "cowrie-kingdoms": { label: "Cowrie Kingdoms", cue: "Follow the spiral, keep the centre in view, and watch for paired runners.", action: "Start a practice route to learn grace entry." },
  "crown-run": { label: "Crown Run", cue: "The nakta is special; capture rules decide when each court can truly open.", action: "Open How to Play for the royal-piece and macho-space guide." },
  fishflow: { label: "Fishflow", cue: "A turn is a current: watch where the final fish settles before choosing your well.", action: "Use the daily or practice current to learn relay sowing." },
  "forty-glacier-guards": { label: "Forty Glacier Guards", cue: "Take in the formation, then look only for the clearest legal step or jump.", action: "Start the drill to see a chain without scanning the whole field." },
  "glacier-trail": { label: "Glacier Trail", cue: "The five houses are your wayfinding landmarks; land precisely at the summit.", action: "Practice a caravan route before combining stored throws." },
  "ice-hunters": { label: "Ice Hunters", cue: "Tigers leap; goats close space. The role indicator tells you which tension matters now.", action: "Use Practice to learn one tiger capture and one goat placement." },
  "ice-rings": { label: "Ice Rings", cue: "Think in rings: choose a clear source, then follow the highlighted legal target.", action: "Open the drill for a compact capture lesson." },
  "khasi-fishflow": { label: "Khasi Fishflow", cue: "Treat every stone drop as a calm current; the final well determines the next story.", action: "Choose Practice for a no-pressure relay round." },
  "polar-tablan": { label: "Polar Tablan", cue: "The route folds: check the row label before allocating a stick score.", action: "Try the drill to see a clean split allocation." },
  "ruma-ice-puzzle": { label: "Ruma Ice Puzzle", cue: "There is no rush. A safe relay ends in the Ruma; undo is always available for learning.", action: "Start the Teaching Current and use Hint only when you want a nudge." },
  "seven-ice-rings": { label: "Seven Ice Rings", cue: "The stones flow anticlockwise; a forced start is a puzzle clue, not a penalty.", action: "Open the drill to practice a capture preview." },
  sige: { label: "Sige", cue: "Trace the outer and inner routes separately; the centre split is a special finishing decision.", action: "Use the Split Centre Drill to see the exception in context." },
  "sixteen-ice-warriors": { label: "Sixteen Ice Warriors", cue: "A clear formation wins more often than a fast move; watch for continued jumps.", action: "Choose the chain drill for a guided first capture." },
  "sky-temple-run": { label: "Sky Temple Run", cue: "Name the route in order: tail, circuit, bridge, then temple arms.", action: "Start the Temple Gate Drill to learn the arrival path." },
  "two-stones": { label: "Two Stones", cue: "With only five points, every gap is a future decision. Look for the final lock.", action: "Open the One-Move Lock Drill for a fast tactical welcome." }
});

export function ExperienceCompanion({ gameId }) {
  const [open, setOpen] = useState(false);
  const brief = GAME_BRIEFS[gameId];
  if (!brief) return null;

  return (
    <aside className={`experience-companion ${open ? "open" : ""}`} aria-label={`${brief.label} field guide`}>
      <button type="button" className="experience-companion-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">✦</span><span>{open ? "Close field guide" : "Field guide"}</span>
      </button>
      {open && (
        <div className="experience-companion-card">
          <p><RecurringCharacter kind="guide" className="experience-companion-pip" />FIRST LOOK · {brief.label.toUpperCase()}</p>
          <strong>{brief.cue}</strong>
          <small>{brief.action}</small>
          <div className="experience-companion-path" aria-label="A gentle learning path">
            <span><b>1</b> Notice</span><span><b>2</b> Try</span><span><b>3</b> Return</span>
          </div>
          <em>Pip says: play at your own pace. The board will wait.</em>
        </div>
      )}
    </aside>
  );
}
