import {CompactMenu} from '../../../../shared/compact-panels/CompactGamePanels.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { PenguinHost } from '../../components/PenguinHosts.jsx';
import { ARMIES, ARMY_META, ROLES, ROLE_LABELS, RULESET_VERSION, createInitialState, getLegalActions, pseudoActions, applyAction, pieceAt, pointKey, teamOf, requiresKingSafety, isInCheck, validateSetup, resolveTurn, positionKey, resign } from './rules.js';
import { ShanshuiBoard } from './ShanshuiBoard.jsx';
import {RoyalResult} from '../shared/RoyalResult.jsx';
import { MODES, ROLE_HELP, CHAPTERS, QUICK_RULES, spriteFor, teamLabel, capital } from './presentation.js';
import './shanshui.css';

const SAVE_KEY = 'antarctic.shanshui.v1';
function savedGame() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s?.state?.rulesetVersion === RULESET_VERSION && Array.isArray(s.state.pieces) && s.state.pieces.length <= 68 && ARMIES.includes(s.state.turn) ? s : null; } catch { return null; } }
const practicePoint = (army, role) => {
  const base = role === 'king' ? [1, 1] : role === 'advisor' ? [0, 1] : role === 'elephant' ? [4, 2] : role === 'mountain-soldier' ? [4, 5] : role === 'river-soldier' ? [5, 4] : [3, 3];
  return { row: ARMY_META[army].rowSign === 1 ? base[0] : 12 - base[0], col: ARMY_META[army].colSign === 1 ? base[1] : 12 - base[1] };
};
export function ShanshuiApp({ onExit = () => {}, assets, workerUrl, onOnline }) {
  const [mode, setMode] = useState('menu'), [state, setState] = useState(createInitialState), [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null), [humanTeam, setHumanTeam] = useState('white'), [difficulty, setDifficulty] = useState('medium');
  const [theme, setTheme] = useState('dark'), [rotation, setRotation] = useState(90), [rules, setRules] = useState(null), [chapter, setChapter] = useState(0);
  const [resultHidden,setResultHidden]=useState(false);
  useEffect(()=>{if(!state.outcome)setResultHidden(false);},[state.outcome]);
  const [army, setArmy] = useState('red'), [role, setRole] = useState('king'), [locked, setLocked] = useState(false), [notice, setNotice] = useState(''), [thinking, setThinking] = useState(false), [saved, setSaved] = useState(savedGame), [confirm, setConfirm] = useState(null);
  const playing = ['bot', 'local', 'four'].includes(mode), sandbox = mode === 'explore' || mode === 'practice';
  const piece = state.pieces.find(p => p.id === selected), activeTeam = teamOf(state.turn), humanTurn = mode !== 'bot' || activeTeam === humanTeam;
  const actions = useMemo(() => playing ? getLegalActions(state) : mode === 'practice' && piece ? pseudoActions(state, piece) : [], [mode, state, selected]);
  const chosenActions = actions.filter(a => a.pieceId === selected);
  const checked = playing && !state.outcome && requiresKingSafety(state, state.turn) && isInCheck(state);
  const warning = playing && !state.outcome && !requiresKingSafety(state, state.turn) && isInCheck(state);
  useEffect(() => {
    if (!rules && !confirm) return;
    const previous = document.activeElement, dialog = document.querySelector('.shanshui-dialog');
    dialog?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { setRules(null); setConfirm(null); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll('button:not(:disabled), select:not(:disabled), [tabindex="0"]')];
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, [rules, confirm]);
  useEffect(() => { if (!playing) return; const value = { state, mode, humanTeam, difficulty }; try { localStorage.setItem(SAVE_KEY, JSON.stringify(value)); setSaved(value); } catch { /* A private session can still continue without storage. */ } }, [state, mode, humanTeam, difficulty]);
  useEffect(() => {
    if (mode !== 'bot' || state.outcome || teamOf(state.turn) === humanTeam) { setThinking(false); return; }
    let live = true; setThinking(true); const id = `${state.ply}-${state.turn}`;
    const worker = workerUrl ? new Worker(workerUrl) : new Worker(new URL('./bot.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => { if (!live || data.id !== id) return; setThinking(false); if (data.error || !data.action) { setNotice(data.error || 'The bot could not find a move. Undo or restart this position.'); return; } const result = applyAction(state, data.action); if (result.state) { setHistory(old => [...old, state].slice(-80)); setState(result.state); setSelected(null); } else setNotice(result.error); };
    worker.onerror = () => { if (live) { setThinking(false); setNotice('The bot worker stopped. Return to the menu and resume to retry.'); } };
    worker.postMessage({ id, state, difficulty });
    return () => { live = false; worker.terminate(); };
  }, [state, mode, humanTeam, difficulty]);
  const start = (nextMode, position = null) => { const next = position || createInitialState({ controlMode: nextMode === 'four' ? 'four' : 'two' }); setState(next); setHistory([]); setSelected(null); setMode(nextMode); setNotice(''); setLocked(false); };
  const commit = action => { const result = applyAction(state, action); if (result.error) return setNotice(result.error); setHistory(old => [...old, state].slice(-80)); setState(result.state); setSelected(null); setNotice(''); };
  function pickPoint(point) {
    if (playing) { if (!humanTurn || state.outcome || thinking) return; const action = chosenActions.find(a => a.to && pointKey(a.to) === pointKey(point)); if (action) return commit(action); const p = pieceAt(state, point); setSelected(p?.army === state.turn ? p.id : null); return; }
    if (mode === 'practice') { const action = actions.find(a => a.to && pointKey(a.to) === pointKey(point)); if (!action) return; setState(old => ({ ...old, pieces: old.pieces.map(p => p.id === selected ? { ...p, ...point } : p) })); return; }
    if (mode === 'explore' && !locked) {
      const target = pieceAt(state, point);
      if (target) { setSelected(target.id); return; }
      if (piece) { setState(old => ({ ...old, pieces: old.pieces.map(p => p.id === selected ? { ...p, ...point } : p) })); setSelected(null); return; }
      const limit = role === 'king' ? 1 : role.endsWith('soldier') ? 3 : 2;
      if (state.pieces.filter(p => p.army === army && p.role === role).length >= limit) return setNotice(`${capital(army)} already has its ${ROLE_LABELS[role]} allocation.`);
      setState(old => ({ ...old, pieces: [...old.pieces, { id: `setup-${army}-${role}-${crypto.randomUUID()}`, army, role, ...point }] })); setNotice('');
    }
  }
  function practice(nextArmy = army, nextRole = role) { setArmy(nextArmy); setRole(nextRole); const p = { id: 'practice-piece', army: nextArmy, role: nextRole, ...practicePoint(nextArmy, nextRole) }; setState({ ...createInitialState(), pieces: [p] }); setSelected(p.id); setMode('practice'); setRules(null); }
  function startEditorMatch() { const errors = validateSetup(state.pieces); if (errors.length) return setNotice(errors.join(' ')); const next = { ...createInitialState(), pieces: state.pieces.map(p => ({ ...p })), repetitions: {} }; next.repetitions[positionKey(next)] = 1; start('local', resolveTurn(next)); }
  function undo() { const list = [...history]; let previous = list.pop(); if (!previous) return; while (mode === 'bot' && list.length && teamOf(previous.turn) !== humanTeam) previous = list.pop(); setState(previous); setHistory(list); setSelected(null); }
  const finalTeam=state.outcome?.winner;
  const resultPieces=state.outcome?state.pieces.filter(p=>state.outcome.type==='draw'||teamOf(p.army)===finalTeam).map(p=>({key:p.id,src:spriteFor(p,assets),alt:`${capital(p.army)} ${ROLE_LABELS[p.role]}`})):[];
  async function shareResult(){const text=`Shanshui Xiangqi · ${state.outcome?.type==='draw'?'Draw':teamLabel(finalTeam)+' victory'} · Antarctic Kingdoms`,title='Antarctic Kingdoms';if(window.Android?.shareText){window.Android.shareText(title,text);return;}if(navigator.share){await navigator.share({title,text});return;}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);setNotice('Result copied.');return;}throw Error('No sharing method is available.');}
  const overlay = (title, content) => <div className="shanshui-overlay" onClick={() => { setRules(null); setConfirm(null); }}><section role="dialog" aria-modal="true" aria-label={title} className="shanshui-dialog" onClick={e => e.stopPropagation()}><header><h2>{title}</h2><button aria-label="Close dialog" onClick={() => { setRules(null); setConfirm(null); }}>×</button></header>{content}</section></div>;
  return <main className={`shanshui-app shanshui-${theme}`}>
    {playing&&state.outcome&&!resultHidden&&<RoyalResult title="Shanshui Xiangqi" kind={state.outcome.type==='draw'?'draw':'win'} winnerLabel={state.outcome.type==='draw'?'A shared honourable draw':teamLabel(finalTeam)+' triumphs'} reason={state.outcome.reason} pieces={resultPieces} viewerWon={mode==='bot'?finalTeam===humanTeam:null} onBack={()=>{setResultHidden(true);onExit();}} onPlayAgain={()=>{setResultHidden(true);start(mode);}} onViewBoard={()=>setResultHidden(true)} onShare={shareResult}/>}

    <header className="shanshui-header"><button onClick={() => mode === 'menu' ? onExit() : setMode('menu')} aria-label={mode === 'menu' ? 'Back to games' : 'Back to Shanshui menu'}>←</button><div><small>ANTARCTIC KINGDOMS</small><h1>Shanshui Xiangqi</h1></div><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle light and dark board">{theme === 'dark' ? '☀' : '☾'}</button></header>
    {mode === 'menu' ? <div className="shanshui-menu"><CompactMenu kind="shanshui">
      <section className="shanshui-intro"><div><span className="shanshui-eyebrow">MOUNTAIN & RIVER CHESS</span><h2>Four armies.<br/>One shared victory.</h2><p>Cross the mountains. Command the river.<br/>Your ally holds the other corner.</p><div className="shanshui-allies"><span>Red + Purple</span><i>vs</i><span>Blue + Green</span></div></div><div className="shanshui-crest"><img src={spriteFor({ army: 'purple', role: 'king' }, assets)} alt="Purple General"/><img src={spriteFor({ army: 'red', role: 'king' }, assets)} alt="Red allied General"/></div></section>
      <section className="shanshui-options" aria-label="Match preferences"><label>Your team<select aria-label="Your team" value={humanTeam} onChange={e => setHumanTeam(e.target.value)}><option value="white">Red + Purple</option><option value="black">Blue + Green</option></select></label><label>Bot level<select aria-label="Bot level" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></section>
      <section className="shanshui-mode-grid">{MODES.map(m => <button key={m.id} onClick={() => start(m.id)}><strong>{m.title}</strong><span>{m.detail}</span><b>→</b></button>)}{onOnline && <button onClick={() => onOnline('two')}><strong>Private online table</strong><span>Invite one friend or choose four-player 2v2.</span><b>→</b></button>}</section>
      {saved && <button className="shanshui-resume" onClick={() => { setState(saved.state); setMode(saved.mode); setHumanTeam(saved.humanTeam); setDifficulty(saved.difficulty); setHistory([]); setSelected(null); }}>Resume saved game · move {saved.state.ply + 1} →</button>}
      <section className="shanshui-learn"><button onClick={() => setRules('quick')}>Quick rules</button><button onClick={() => { setRules('full'); setChapter(0); }}>Full rules</button><button onClick={() => practice()}>Learn piece movement</button><button onClick={() => start('explore', { ...createInitialState(), pieces: [] })}>Arrange the board freely</button></section>
      <aside className="shanshui-guide"><PenguinHost host="pengu" size="mini"/><p><strong>Piko’s first tip</strong>Two-player mode gives you two armies. Only the highlighted army moves on each turn.</p></aside>
      <p className="shanshui-edition">Chinese Xiangqi adaptation · Antarctic v1. Four-player 2v2 and the digital completion rules are labelled in Full rules.</p>
    </CompactMenu></div> : <div className="shanshui-play-layout">
      <section className="shanshui-table">
        <div className="shanshui-army-strip" aria-label="Army turn order">{ARMIES.map(a => <span key={a} className={state.turn === a && playing && !state.outcome ? 'active' : ''} style={{ '--army': ARMY_META[a].color }}><i/>{capital(a)}<small>{state.eliminated[a] ? 'Defeated' : teamLabel(teamOf(a))}</small></span>)}</div>
        <ShanshuiBoard state={state} actions={actions} selected={selected} onPoint={pickPoint} theme={theme} rotation={rotation} assets={assets} editable={mode === 'explore' && !locked} interactive={!playing || humanTurn && !thinking && !state.outcome}/>
      </section>
      <section className="shanshui-controls">
        {playing && <>
          <div className="shanshui-turn" role="status" aria-live="polite"><small>{mode === 'four' ? 'FOUR-PLAYER 2v2 · ADAPTATION' : mode === 'bot' ? 'QUICK PLAY (VS BOT)' : 'TWO PLAYERS · TWO ARMIES EACH'}</small><h2>{state.outcome ? state.outcome.type === 'draw' ? 'A shared draw' : `${teamLabel(state.outcome.winner)} win` : thinking ? `${capital(state.turn)} is thinking…` : `${capital(state.turn)} to move`}</h2><p>{state.outcome ? state.outcome.reason : `${teamLabel(activeTeam)} · ${requiresKingSafety(state, state.turn) ? 'Lone army: keep your General safe.' : 'Capture phase: your ally remains.'}`}</p></div>
          {(checked || warning) && <p className="shanshui-warning">{checked ? 'Check — protect your General.' : 'Your General is attacked. Capture-phase rules allow you to continue.'}</p>}
          <p className="shanshui-selection">{piece ? `${capital(piece.army)} ${ROLE_LABELS[piece.role]} · ${chosenActions.length} destinations` : 'Select a piece to see its legal moves.'}</p>
          {piece && <p className="shanshui-help">{ROLE_HELP[piece.role]}</p>}
          {actions.some(a => a.kind === 'pass') && !state.outcome && <button className="shanshui-primary" disabled={!humanTurn} onClick={() => commit({ kind: 'pass' })}>No legal move · Pass</button>}
          {chosenActions.some(a => a.kind === 'royal-capture') && <p className="shanshui-warning">Select the opposing General to capture and return in one action.</p>}
          <p className="shanshui-journal" aria-live="polite">{state.note}</p>
          <div className="shanshui-actions"><button disabled={!history.length} onClick={undo}>Undo</button><button onClick={() => setConfirm('restart')}>Restart</button><button disabled={!!state.outcome} onClick={() => setConfirm('resign')}>Resign</button></div>
        </>}
        {mode === 'practice' && <><span className="shanshui-eyebrow">LEARN ONE PIECE AT A TIME</span><h2>{ROLE_LABELS[role]}</h2><p>{ROLE_HELP[role]}</p><p className="shanshui-help">Tap a highlighted point. This practice has no opponents, turns or match result.</p><label>Army<select value={army} onChange={e => practice(e.target.value, role)}>{ARMIES.map(a => <option key={a}>{a}</option>)}</select></label><div className="shanshui-palette">{ROLES.map(r => <button key={r} aria-pressed={r === role} onClick={() => practice(army, r)}><img src={spriteFor({ army, role: r }, assets)} alt=""/><span>{ROLE_LABELS[r]}</span></button>)}</div><button onClick={() => practice()}>Reset piece</button></>}
        {mode === 'explore' && <><span className="shanshui-eyebrow">ARRANGE THE BOARD FREELY</span><h2>{locked ? 'Arrangement locked' : 'Your empty table'}</h2><p>{locked ? 'Unlock to edit, or validate this setup for a local match.' : piece ? 'Tap an empty point to move the selected piece.' : 'Choose a piece, then tap an empty point to place it.'}</p><label>Army<select value={army} disabled={locked} onChange={e => { setArmy(e.target.value); setSelected(null); }}>{ARMIES.map(a => <option key={a}>{a}</option>)}</select></label><div className="shanshui-palette">{ROLES.map(r => <button key={r} disabled={locked} aria-pressed={!selected && r === role} onClick={() => { setRole(r); setSelected(null); }}><img src={spriteFor({ army, role: r }, assets)} alt=""/><span>{ROLE_LABELS[r]}</span></button>)}</div><div className="shanshui-actions"><button onClick={() => { setLocked(!locked); setSelected(null); }}>{locked ? 'Unlock' : 'Lock arrangement'}</button><button disabled={locked || !selected} onClick={() => { setState(old => ({ ...old, pieces: old.pieces.filter(p => p.id !== selected) })); setSelected(null); }}>Remove selected</button><button disabled={locked} onClick={() => { setState(createInitialState()); setSelected(null); }}>Starting position</button><button disabled={locked} onClick={() => { setState({ ...createInitialState(), pieces: [] }); setSelected(null); }}>Clear board</button><button className="shanshui-primary" onClick={startEditorMatch}>Validate & play locally</button></div></>}
        <div className="shanshui-actions"><button onClick={() => setRotation((rotation + 90) % 360)}>Rotate view</button><button onClick={() => setRules('quick')}>How to Play</button></div>
        {notice && <p className="shanshui-warning" role="alert">{notice}</p>}
      </section>
    </div>}
    {rules && overlay('How to Play', <><nav className="shanshui-rule-tabs"><button onClick={() => setRules('quick')} aria-pressed={rules === 'quick'}>Quick rules</button><button onClick={() => setRules('full')} aria-pressed={rules === 'full'}>Full rules</button><button onClick={() => practice()}>Learn piece movement</button></nav>{rules === 'quick' ? <ol>{QUICK_RULES.map(text => <li key={text}>{text}</li>)}</ol> : <><label className="shanshui-progress-label">Full rules · {Math.round((chapter + 1) / CHAPTERS.length * 100)}%<progress max={CHAPTERS.length} value={chapter + 1}/></label><h3>{CHAPTERS[chapter].title}</h3>{CHAPTERS[chapter].paragraphs.map(p => <p key={p}>{p}</p>)}<div className="shanshui-actions"><button disabled={!chapter} onClick={() => setChapter(chapter - 1)}>Previous</button><button className="shanshui-primary" onClick={() => chapter === CHAPTERS.length - 1 ? setRules(null) : setChapter(chapter + 1)}>{chapter === CHAPTERS.length - 1 ? 'Ready to play' : 'Next'}</button></div></>}<p className="shanshui-edition">Ruleset {RULESET_VERSION}. Digital completion choices are explained in the final chapter.</p></>)}
    {confirm && overlay(confirm === 'resign' ? 'Resign this match?' : 'Restart this match?', <><p>{confirm === 'resign' ? mode === 'four' ? `Only ${capital(state.turn)} resigns; its ally continues.` : `The ${teamLabel(mode === 'bot' ? humanTeam : activeTeam)} team resigns.` : 'Your current board will be replaced with the starting position.'}</p><div className="shanshui-actions"><button onClick={() => setConfirm(null)}>Cancel</button><button className="shanshui-primary" onClick={() => { if (confirm === 'restart') start(mode); else setState(resign(state, mode === 'four' ? state.turn : mode === 'bot' ? humanTeam : activeTeam)); setConfirm(null); }}>Confirm</button></div></>)}
  </main>;
}
export default ShanshuiApp;
