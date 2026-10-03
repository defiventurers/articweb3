import React, { useState } from 'react';
import { DICE_ROLLS, PIECE_NAME, TEAM_LABEL, TEAM_COLOR, makePiece, getPawnPromotionType } from '../../game/gameRules.js';
import { TEAMS, LESSONS, squareName, createLesson, lessonTargets, moveLesson } from './movementLesson.js';
import './arcticMovementGuide.css';
const FILES={pawn:'snow-guard',king:'frost-king',elephant:'war-mammoth',horse:'aurora-unicorn',ship:'icebreaker'};
function Piece({piece}) {
  const [failed,setFailed]=useState(false);
  return failed ? <span className="adg-fallback">{LESSONS[piece.type].icon}</span> : <img src={`/assets/artic/lesson-pieces/${piece.team==='yellow'?'pink':piece.team}-${FILES[piece.type]}.webp`} alt={`${TEAM_LABEL[piece.team]} ${PIECE_NAME[piece.type]}`} draggable="false" onError={()=>setFailed(true)}/>;
}
const dieName=v=>DICE_ROLLS[v].map(t=>PIECE_NAME[t]).join(' / ');
export default function ArcticMovementGuide({onExit,onPlay}) {
  const [team,setTeam]=useState('red'),[enemy,setEnemy]=useState('blue'),[type,setType]=useState('pawn');
  const [example,setExample]=useState('attack');
  const [scene,setScene]=useState(()=>createLesson('pawn','red','blue'));
  const [history,setHistory]=useState([]),[mode,setMode]=useState('move'),[enemyType,setEnemyType]=useState('pawn');
  const [diceMode,setDiceMode]=useState(false),[dice,setDice]=useState({values:[1,2],used:[false,false]});
  const [notice,setNotice]=useState('Try a coral capture square. The enemy straight ahead blocks your Guard.');
  const lesson=LESSONS[type], mover=scene.board[scene.position.row][scene.position.col];
  const activeDie=dice.values.findIndex((v,i)=>!dice.used[i] && DICE_ROLLS[v].includes(mover.type));
  const targets=lessonTargets(scene), legal=new Map(targets.map(m=>[`${m.toRow},${m.toCol}`,m]));
  const gated=diceMode && activeDie<0;
  function load(t=type,own=team,opponent=enemy,ex=example) {
    setType(t);setTeam(own);setEnemy(opponent);setExample(ex);setScene(createLesson(t,own,opponent,ex));setHistory([]);setMode('move');
    setDice(d=>({...d,used:[false,false]}));
    setNotice(ex==='empty'?'Explore the highlighted moves. Choose a starting square to try the board edges.':ex==='promotion'?'Move forward onto the far edge. The label on each edge square shows its promotion.':ex==='royal'?'Capture the enemy royal King. Watch its remaining pieces disappear.':LESSONS[t].challenge);
  }
  function remember() {setHistory(h=>[...h,{scene,dice,notice}]);}
  function clickSquare(row,col) {
    const isMover=scene.position.row===row && scene.position.col===col, occupant=scene.board[row][col];
    if(mode==='place') {
      if(occupant && !isMover) {setNotice('Remove the piece on that square before placing your learner there.');return;}
      remember(); const board=scene.board.map(line=>[...line]);board[scene.position.row][scene.position.col]=null;board[row][col]=mover;
      setScene({board,position:{row,col}});setMode('move');setNotice(`Starting at ${squareName(row,col)}. Try a highlighted destination.`);return;
    }
    if(mode==='enemy' || mode==='friend') {
      if(isMover) {setNotice('This is your learner. Choose another square.');return;}
      remember();const board=scene.board.map(line=>[...line]);board[row][col]=occupant?null:makePiece(mode==='friend'?team:enemy,enemyType==='fighter-king'?'king':enemyType,enemyType==='king');
      setScene({...scene,board});setNotice(occupant?`Removed piece at ${squareName(row,col)}.`:`Added ${mode==='friend'?'friendly blocker':TEAM_LABEL[enemy]+' enemy'} at ${squareName(row,col)}.`);return;
    }
    if(isMover) {setNotice('Your piece is selected. Green dots are moves; coral rings are captures.');return;}
    if(gated) {setNotice(`No unused die activates ${PIECE_NAME[mover.type]}. Change a die or roll two new dice.`);return;}
    const next=moveLesson(scene,row,col);
    if(!next) {setNotice(`${squareName(row,col)} is not a legal destination. ${LESSONS[mover.type].rule}`);return;}
    remember();setScene(next);if(diceMode)setDice(d=>({...d,used:d.used.map((used,i)=>used||i===activeDie)}));setNotice(next.message);
  }
  function changeTeam(t) {load(type,t,enemy===t?TEAMS.find(e=>e!==t):enemy);}
  function setDie(i,v) {setDice(d=>({values:d.values.map((old,j)=>i===j?Number(v):old),used:d.used.map((old,j)=>i===j?false:old)}));setNotice('Practice dice updated. Each matching die pays for one move.');}
  const direction=({red:'right →',blue:'left ←',green:'up ↑',yellow:'down ↓'})[team];
  return <section className="adg" aria-label="Arctic Dominion movement academy">
    <div className="adg-shell">
      <header className="adg-header"><div><p className="adg-eyebrow">FROST ACADEMY / INTERACTIVE FIELD GUIDE</p><h1>Learn Arctic Dominion.<br/><span>One piece at a time.</span></h1><p>See a move. Try a capture. Discover what makes each piece different.</p></div><div className="adg-header-actions"><button onClick={onExit}>← All games</button><button onClick={onPlay}>Play Arctic Dominion ↗</button></div></header>
      <nav className="adg-roster" aria-label="Choose a piece lesson">{Object.entries(LESSONS).map(([t,l],i)=><button key={t} aria-pressed={type===t} onClick={()=>load(t,team,enemy,'attack')}><span className="adg-roster-number">0{i+1}</span><Piece key={`${team}-${t}`} piece={makePiece(team,t)}/><strong>{l.title}</strong><small>{l.shape}</small></button>)}</nav>
      <div className="adg-layout"><main className="adg-board-panel">
        <div className="adg-board-heading"><div><p className="adg-eyebrow">{mode==='move'?'TAP A HIGHLIGHTED DESTINATION':mode==='place'?'CHOOSE ANY FREE ON-BOARD SQUARE':`TAP TO ADD OR REMOVE ${mode==='friend'?'FRIENDS':'ENEMIES'}`}</p><h2>{PIECE_NAME[mover.type]} <span>· {TEAM_LABEL[team]}</span></h2></div><span className="adg-mode-badge">{diceMode?'Dice practice':'Free exploration'}</span></div>
        <div className="adg-legend"><span><i className="adg-dot"/>Move</span><span><i className="adg-ring"/>Capture</span><span><i className="adg-selection"/>Your piece</span>{type==='pawn' && <span>Forward: <b>{direction}</b></span>}</div>
        <div className="adg-board" role="group" aria-label="8 by 8 movement board">{scene.board.flatMap((line,row)=>line.map((piece,col)=>{
          const selected=scene.position.row===row && scene.position.col===col, target=legal.get(`${row},${col}`),available=target&&!gated&&mode==='move';
          const promotion=type==='pawn'&&getPawnPromotionType(team,row,col);
          const action=mode==='place'?'Place at':mode==='enemy'||mode==='friend'?piece?'Remove piece at':'Add piece at':available?target.captured?'Capture at':'Move to':'Inspect';
          return <button type="button" key={`${row}-${col}`} data-square={squareName(row,col)} data-capture={Boolean(available&&target.captured)} className={`adg-cell ${(row+col)%2?'dark':'light'} ${selected?'selected':''} ${available?target.captured?'capture':'legal':''} ${piece&&!selected?piece.team===team?'friend':'enemy':''}`} aria-label={`${action} ${squareName(row,col)}${piece?`, ${TEAM_LABEL[piece.team]} ${PIECE_NAME[piece.type]}`:''}`} onClick={()=>clickSquare(row,col)}>
            {piece&&<Piece key={`${piece.team}-${piece.type}`} piece={piece}/>}<span className="adg-coordinate">{squareName(row,col)}</span>{promotion&&!piece&&<small className="adg-promotion">{LESSONS[promotion].icon}</small>}{piece?.type==='king'&&<span className="adg-royal-tag">{piece.isRoyal===false?'FIGHTER':'ROYAL'}</span>}
          </button>;
        }))}</div>
        <div className="adg-feedback" role="status"><span>✦</span><p>{notice}</p></div>
        <div className="adg-tools">{mode!=='move'&&<button onClick={()=>{setMode('move');setNotice('Your setup is ready. Try a highlighted move or capture.');}}>Try movement</button>}<button aria-pressed={mode==='place'} onClick={()=>setMode(mode==='place'?'move':'place')}>Choose starting square</button><button disabled={!history.length} onClick={()=>{const previous=history.at(-1);setScene(previous.scene);setDice(previous.dice);setNotice(previous.notice);setHistory(history.slice(0,-1));setMode('move');}}>Undo</button><button onClick={()=>load()}>Reset lesson</button></div>
      </main><aside className="adg-sidebar">
        <section className="adg-card"><p className="adg-eyebrow">01 / UNDERSTAND THE PIECE</p><h2>{lesson.title}</h2><p>{lesson.rule}</p><div className="adg-key-rule">{lesson.difference}</div>{mover.type!==type&&<p className="adg-promoted-rule"><b>Now moves as {PIECE_NAME[mover.type]}:</b> {LESSONS[mover.type].rule}</p>}<p className="adg-dice-note">🎲 Activated by die <b>{lesson.dice}</b></p><div className="adg-examples"><button aria-pressed={example==='attack'} onClick={()=>load(type,team,enemy,'attack')}>Attack & blockers</button><button aria-pressed={example==='empty'} onClick={()=>load(type,team,enemy,'empty')}>Open board</button><button aria-pressed={example==='royal'} onClick={()=>load(type,team,enemy,'royal')}>Capture a royal King</button>{type==='pawn'&&<button aria-pressed={example==='promotion'} onClick={()=>load(type,team,enemy,'promotion')}>Try promotion</button>}</div></section>
        <section className="adg-card"><p className="adg-eyebrow">02 / MAKE IT YOUR OWN</p><h3>Your kingdom</h3><div className="adg-teams">{TEAMS.map(t=><button key={t} aria-pressed={team===t} style={{'--team':TEAM_COLOR[t]}} onClick={()=>changeTeam(t)}><i/>{TEAM_LABEL[t]}</button>)}</div><div className="adg-fields"><label>Enemy kingdom<select value={enemy} onChange={e=>setEnemy(e.target.value)}>{TEAMS.filter(t=>t!==team).map(t=><option key={t} value={t}>{TEAM_LABEL[t]}</option>)}</select></label><label>Piece to add<select value={enemyType} onChange={e=>setEnemyType(e.target.value)}>{Object.keys(LESSONS).map(t=><option key={t} value={t}>{PIECE_NAME[t]}{t==='king'?' (royal)':''}</option>)}<option value="fighter-king">Frost King (promoted fighter)</option></select></label></div><p className="adg-small">The enemy selector colours new pieces. Mix opposing kingdoms on the same board.</p><div className="adg-tools"><button aria-pressed={mode==='enemy'} onClick={()=>setMode(mode==='enemy'?'move':'enemy')}>Add / remove enemies</button><button aria-pressed={mode==='friend'} onClick={()=>setMode(mode==='friend'?'move':'friend')}>Add / remove friends</button><button onClick={()=>{remember();setScene({...scene,board:scene.board.map((line,r)=>line.map((p,c)=>r===scene.position.row&&c===scene.position.col?p:null))});setMode('move');setNotice('Cleared all surrounding pieces. Your learner stays in place.');}}>Clear surrounding pieces</button></div></section>
        <section className="adg-card"><p className="adg-eyebrow">03 / ADD THE DICE</p><label className="adg-toggle"><input type="checkbox" checked={diceMode} onChange={e=>{setDiceMode(e.target.checked);setMode('move');}}/>Use dice restrictions</label><p className="adg-small">In a match, roll two dice and use each once. Here you can choose faces to study the rule. Changing lessons starts a fresh drill.</p>{diceMode&&<><div className="adg-fields">{dice.values.map((value,i)=><label key={i}>Die {i+1} {dice.used[i]?'· used':'· available'}<select aria-label={`Die ${i+1}`} value={value} onChange={e=>setDie(i,e.target.value)}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v} · {dieName(v)}</option>)}</select></label>)}</div><button className="adg-roll" onClick={()=>{setDice({values:[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)],used:[false,false]});setNotice('Rolled two practice dice. Look for a matching unused face.');}}>Roll two dice</button><p className="adg-dice-note">{gated?`No unused die matches ${PIECE_NAME[mover.type]}.`:`Die ${activeDie+1} can move ${PIECE_NAME[mover.type]}.`}</p></>}</section>
      </aside></div>
      <footer className="adg-footer"><strong>Same ice. Different possibilities.</strong><p>All 64 squares are playable; the ice is decorative. Friends block landing squares. Jumpers ignore intervening pieces. Guards promote by their destination on the far edge; a promoted King is a fighter and its capture does not eliminate the kingdom.</p><span>Practice is local · no account needed · no match in progress</span></footer>
    </div>
  </section>;
}
