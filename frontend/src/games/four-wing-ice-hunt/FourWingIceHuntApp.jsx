import { useEffect, useRef, useState } from "react";
import { chooseStandardFourWingBotAction } from "./standardBot.js";
import { FourWingStandardBoard } from "./FourWingStandardBoard.jsx";
import { FourWingIceHuntOnline } from "./FourWingIceHuntOnline.jsx";
import { FOUR_WING_STANDARD_RULESET, applyStandardAction, createStandardFourWingState, describeTurn, getCounts, getLegalActions, getPhase, resultDetail, resultTitle } from "./standardRules.js";

export function FourWingIceHuntApp({ onExitToLibrary, profile, onProfileChange }) {
  const [screen, setScreen] = useState("cover");
  const [mode, setMode] = useState("practice-leopards");
  const [state, setState] = useState(() => createStandardFourWingState({ mode: "practice-leopards" }));
  const [selectedNode, setSelectedNode] = useState(null);
  const [message, setMessage] = useState("");
  const botTimer = useRef(null);
  const humanRole = mode === "practice-cattle" ? "cattle" : "leopards";
  const botRole = humanRole === "leopards" ? "cattle" : "leopards";

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (screen !== "game" || mode === "hotseat" || state.winner || state.currentPlayer !== botRole) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseStandardFourWingBotAction(state, botRole);
      if (!action) return;
      const result = applyStandardAction(state, action, botRole);
      setState(result.state);
      setSelectedNode(null);
      setMessage(result.error || "");
    }, getPhase(state) === "deployment" ? 420 : 620);
  }, [botRole, mode, screen, state]);

  function startGame(nextMode) { setMode(nextMode); setState(createStandardFourWingState({ mode: nextMode })); setSelectedNode(null); setMessage(""); setScreen("game"); }
  function resetGame() { setState(createStandardFourWingState({ mode })); setSelectedNode(null); setMessage(""); }
  function canHumanAct() { return mode === "hotseat" || state.currentPlayer === humanRole; }
  function submitAction(action, player) { const result = applyStandardAction(state, action, player); setState(result.state); setSelectedNode(null); setMessage(result.error || ""); }

  function handleNode(nodeId) {
    if (state.winner || !canHumanAct()) return;
    const player = state.currentPlayer;
    const legalActions = getLegalActions(state, player);
    if (getPhase(state) === "deployment" && player === "cattle") {
      const place = legalActions.find((action) => action.type === "place" && action.nodeId === nodeId);
      if (place) return submitAction(place, player);
      return setMessage(state.board[nodeId] ? "That intersection is occupied." : "Deploy to an open intersection.");
    }
    if (state.board[nodeId] === player) { setSelectedNode(selectedNode === nodeId ? null : nodeId); setMessage(""); return; }
    if (!selectedNode) return setMessage(state.captureChainFrom ? "Continue with the same snow leopard." : `Select one of your ${player === "leopards" ? "snow leopards" : "colony pieces"} first.`);
    const action = legalActions.find((candidate) => candidate.type !== "place" && candidate.from === selectedNode && candidate.to === nodeId);
    if (action) return submitAction(action, player);
    setMessage(player === "leopards" ? "Choose an adjacent open point or a legal capture landing." : "Colonisers move one step along a printed line.");
  }

  if (screen === "cover") return <section className="fwh-cover fwh-art-cover" aria-label="Four-Wing Ice Hunt cover"><button className="fwh-back-pill" onClick={onExitToLibrary}>← All Games</button><img className="fwh-art-cover-image" src="/assets/four-wing-ice-hunt-cover.png" alt="Four-Wing Ice Hunt: Leopards and Colonisers game-box cover" /><div className="fwh-cover-copy fwh-art-cover-copy"><p>FOUR-WING HUNT · STANDARD RULESET</p><button onClick={() => setScreen("menu")}>Enter the hunt</button></div></section>;
  if (screen === "menu") return <section className="fwh-menu" aria-label="Four-Wing Ice Hunt menu"><button className="fwh-back-pill" onClick={() => setScreen("cover")}>← Cover</button><article className="fwh-menu-card"><p className="fwh-eyebrow">FOUR-WING HUNT · STANDARD RULESET</p><h1>Four-Wing Ice Hunt</h1><p>Deploy twenty-four penguin colonisers to imprison two mobile snow leopards. Eight colonisers begin on the ice; the remaining sixteen arrive between leopard turns.</p><div className="fwh-menu-actions"><button className="primary" onClick={() => setScreen("online")}>Online Multiplayer</button><button onClick={() => startGame("practice-leopards")}>Practice as Snow Leopards</button><button onClick={() => startGame("practice-cattle")}>Practice as the Colony</button><button onClick={() => startGame("hotseat")}>Local Two Player</button><button onClick={() => setScreen("rules")}>How to Play</button></div><div className="fwh-source-note">Standard play: two leopards begin on opposite wings; eight colonisers hold the central pattern; sixteen reserves deploy one at a time between leopard turns. Leopards win at twelve captures. The colony wins by immobilising both hunters.</div></article></section>;
  if (screen === "online") return <FourWingIceHuntOnline profile={profile} onProfileChange={onProfileChange} onBack={() => setScreen("menu")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} onStart={() => startGame("practice-leopards")} />;

  const counts = getCounts(state);
  const currentName = state.currentPlayer === "leopards" ? "Snow Leopards" : "Penguin Colony";
  const isBotThinking = mode !== "hotseat" && state.currentPlayer === botRole && !state.winner;
  return <section className="fwh-game" aria-label="Four-Wing Ice Hunt game"><header className="fwh-game-header"><button onClick={() => setScreen("menu")}>← Menu</button><div><p>FOUR-WING HUNT · {FOUR_WING_STANDARD_RULESET.rulesetVersion}</p><h1>Four-Wing Ice Hunt</h1></div><button onClick={resetGame}>New Match</button></header><main className="fwh-game-layout"><aside className="fwh-role-card leopards"><span className="fwh-role-icon">✦</span><strong>Snow Leopards</strong><small>{counts.leopardsOnBoard} hunters on the ice</small><em>Capture 12 colonisers</em></aside><div className="fwh-board-shell"><div className="fwh-turn-banner" data-player={state.currentPlayer}><strong>{state.winner ? resultTitle(state) : isBotThinking ? `${currentName} are planning…` : describeTurn(state)}</strong><span>{state.winner ? resultDetail(state) : `Turn ${state.turn} · ${getPhase(state)} · ${counts.cattleInHand} reserve`}</span></div><FourWingStandardBoard state={state} selectedNode={selectedNode} onNode={handleNode} interactive={!isBotThinking && !state.winner} />{message && <p className="fwh-game-message" role="alert">{message}</p>}{state.winner && <div className="fwh-result-actions"><button onClick={resetGame}>Play Again</button><button onClick={() => setScreen("menu")}>Main Menu</button></div>}</div><aside className="fwh-role-card cattle"><span className="fwh-role-icon">●</span><strong>Penguin Colony</strong><small>{counts.cattleOnBoard} active · {counts.cattleInHand} reserve</small><em>{counts.cattleCaptured} captured · trap both hunters</em></aside></main><footer className="fwh-game-footer"><span>Mode: {modeLabel(mode)}</span><span>{state.captureChainFrom ? "A capture continuation is mandatory." : "Movement follows connected ice lines only."}</span></footer></section>;
}

function RulesScreen({ onBack, onStart }) {
  return <section className="fwh-rules" aria-label="Four-Wing Ice Hunt rules"><button className="fwh-back-pill" onClick={onBack}>← Menu</button><article><p className="fwh-eyebrow">HOW TO PLAY · FOUR-WING HUNT</p><h1>Seal every escape.</h1><p className="fwh-rules-intro">Four-Wing Hunt is an asymmetric line-board strategy game: two snow leopards hunt through the ice while a colony of twenty-four penguin colonisers builds a moving trap.</p><div className="fwh-rule-grid"><section><strong>1 · Set the hunt</strong><p>Place both snow leopards on the marked opposite outer-wing starts. Place eight penguin colonisers on the highlighted central intersections. Keep the remaining sixteen as the colony reserve.</p></section><section><strong>2 · Deploy the reserve</strong><p>During deployment, the colony places one reserve penguin on any open intersection. The leopard player then takes one leopard turn. Continue until all twenty-four penguins have entered play; penguins do not make ordinary moves yet.</p></section><section><strong>3 · Follow the ice lines</strong><p>Every piece stands on an intersection. A normal move goes exactly one step to an adjacent open intersection joined by a visible line. Nearby points are not connected unless a line links them.</p></section><section><strong>4 · Hunt and capture</strong><p>A snow leopard captures by jumping a directly adjacent penguin along a legal line to the empty intersection immediately beyond it. Remove that penguin permanently. Penguins never jump or capture.</p></section><section><strong>5 · Continue the chase</strong><p>If a leopard lands after a capture and can legally jump another penguin, it must continue with that same leopard. Each landing point must be open, and a leopard can never jump the other leopard.</p></section><section><strong>6 · Win the four wings</strong><p>The snow leopards win immediately after capturing twelve or more penguins. The colony wins immediately when both leopards have no legal one-step move and no legal capture.</p></section></div><div className="fwh-modern-policy"><strong>Quick clarification</strong><span>Captured penguins never return to the board. A capture needs an empty landing point. Once a multi-capture begins, continuing legal jumps are mandatory. The digital edition records a draw only after three identical movement positions or 160 captureless movement turns.</span></div><button className="fwh-rules-start" onClick={onStart}>Start as Snow Leopards</button></article></section>;
}

function modeLabel(mode) { if (mode === "hotseat") return "Local Two Player"; return mode === "practice-cattle" ? "Practice as Colony" : "Practice as Snow Leopards"; }
