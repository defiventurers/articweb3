import React,{useEffect,useRef,useState} from 'react';
import {NETWORKS} from './chain.js';
const names={shogi:'Shogi',sannin:'Sannin Shogi',sanguo:'Sanguo Qi',sanyou:'San You Qi',yanyi:'Sanguo Yan Yi Qi',xiangqi:'Xiangqi',dominion:'Chaturanga',shanshui:'Shanshui Xiangqi','shanshui-2v2':'Shanshui Xiangqi · 2v2','co-tu-lenh':'Cờ Tư Lệnh'};
const seat=s=>({red:'Red',green:'Green',blue:'Blue',black:'Blue',yellow:'Pink'})[s]||s;
const short=s=>s?String(s).slice(0,10)+'…'+String(s).slice(-6):'—';
function describe(event) {
 const id=event.signed.intent.actionId||'',kind=event.kind==='resign'?'resign':id.split('|')[0];
 if(id.startsWith('ctl:')){try{const action=JSON.parse(id.slice(4));return ({'end-turn':'End turn',concede:'Concede'})[action.kind]||`${action.kind} ${action.id||''}${Number.isInteger(action.x)?` → ${action.x+1},${action.y+1}`:''}`;}catch{return 'Commander action';}}
 if(event.rng)return 'Roll '+event.rng.values.join(' + ');
 return ({resign:'Leave this seat',end:'End turn',skip:'Skip turn',claim:'Claim the defeated army',drop:'Drop a captured piece',castle:'Castle'})[kind]||'Move '+id.split('|').slice(1,3).join(' → ').replace(/piece:|hand:/g,'').replace(/-/g,' ');
}
export function FairPlayPanel({initialBundle=null,loadCurrent,loadHistory,loadMatch,shareMatch,practice=false,workerUrl='fair-worker.js',assetBase='https://articweb3.onrender.com/arctic-play/app/',onClose}) {
 const [bundle,setBundle]=useState(initialBundle),[history,setHistory]=useState([]),[tab,setTab]=useState('moves'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[report,setReport]=useState(null),[progress,setProgress]=useState(null),[replay,setReplay]=useState(null),[share,setShare]=useState(''),[shareConsent,setShareConsent]=useState(false);
 const file=useRef(),worker=useRef(),sequence=useRef(0);
 useEffect(()=>()=>{worker.current?.terminate();},[]);
 function install(value){setBundle(value);setReport(null);setReplay(null);setError('');setShare('');setShareConsent(false);}
 async function run(fn){setBusy(true);setError('');try{return await fn();}catch(e){setError(e.message||'This proof could not be loaded.');}finally{setBusy(false);}}
 async function refresh(){return run(async()=>{if(loadCurrent){const b=await loadCurrent();if(b)install(b);}if(loadHistory){const h=await loadHistory();setHistory(h.matches||[]);}});}
 useEffect(()=>{if(!initialBundle&&(loadCurrent||loadHistory))refresh();},[]);
 async function importFile(event){const selected=event.target.files?.[0];event.target.value='';if(!selected)return;await run(async()=>{if(selected.size>20*1024*1024)throw Error('Choose a proof smaller than 20 MB.');const value=JSON.parse(await selected.text()),b=value.bundle||value;if(b?.header?.protocol!=='ak-fair-play-v1'||!Array.isArray(b.header.actors)||!Array.isArray(b.events)||b.events.length>4000||b.events.some(e=>!e?.signed?.intent||typeof e.hash!=='string'||(e.rng&&(!Array.isArray(e.rng.values)||e.rng.values.length>2))))throw Error('Choose an Antarctic Kingdoms match-proof JSON file.');install(b);});}
 function check(){
  if(!bundle?.events.length)return;
  worker.current?.terminate();worker.current=new Worker(workerUrl);const id=++sequence.current;
  setBusy(true);setError('');setReport(null);setReplay(null);setProgress({checked:0,total:bundle.events.length});
  worker.current.onmessage=({data})=>{if(data.id!==id)return;if(data.type==='progress'){setProgress(data.progress);return;}if(data.type==='verified'){setReport(data.report);setBusy(false);setProgress(null);}if(data.type==='replay'){setReplay(data);setBusy(false);}if(data.error){setError(data.error);setBusy(false);setProgress(null);}};
  worker.current.onerror=()=>{setError('The verifier could not start. Reopen Fair Play and try again.');setBusy(false);};
  worker.current.postMessage({id,type:'verify',bundle});
 }
 function stop(){worker.current?.terminate();worker.current=null;setBusy(false);setProgress(null);}
 function showStep(step){if(!worker.current||!report)return;setBusy(true);worker.current.postMessage({id:sequence.current,type:'replay',step});}
 async function download(){await run(async()=>{const text=JSON.stringify(bundle,null,2),name='Antarctic-proof-'+bundle.header.matchId+'.json';if(globalThis.Android?.saveFairProof){if(!Android.saveFairProof(name,text))throw Error('The proof could not be saved.');return;}const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);});}
 const checked=report?.status==='checked',events=bundle?.events||[],rolls=events.filter(e=>e.rng),chain=report?.chain,covered=chain?.status==='confirmed'?chain.covered:0;
 const latest=bundle?.header,game=names[latest?.gameId]||'Your match';
 return <section className="fair-play" aria-label="Fair Play and match proofs">
  <header className="fair-heading"><span className="fair-shield" aria-hidden="true">◇</span><div><p className="fair-eyebrow">ANTARCTIC KINGDOMS</p><h2>Fair Play</h2><p>Verification is on hold. Your saved records remain available.</p></div>{onClose&&<button className="fair-close" aria-label="Close Fair Play" onClick={onClose}>×</button>}</header>
  <div className="fair-tools"><button onClick={()=>file.current.click()} disabled={busy}>Import proof</button>{(loadCurrent||loadHistory)&&<button onClick={refresh} disabled={busy}>Refresh</button>}<input ref={file} type="file" accept=".json,application/json" onChange={importFile} hidden/></div>
  {error&&<p className="fair-error" role="alert">{error}</p>}
  {!bundle&&<div className="fair-empty"><div className="fair-orbit" aria-hidden="true">◇</div><h3>{practice?'Practice, on your phone':'Every match has a story.'}</h3><p>{practice?'Practice games use local rules and randomness. Online proof-enabled rooms create signed records you can inspect here.':'Open an online match or import its proof to check the moves, dice and blockchain records.'}</p><p className="fair-small">No monetary payouts are enabled in these app matches.</p></div>}
  {bundle&&<>
   <div className="fair-match-title"><div><h3>{game}</h3><p>{bundle.closure?'Finished record':'Match in progress'} · {events.length} {events.length===1?'action':'actions'}</p></div><span className={'fair-tag '+(checked?'checked':'')}>{checked?'Moves checked':events.length?'Recorded':'Not played yet'}</span></div>
   <div className="fair-facts">
    <div><span>Moves</span><strong>{checked?report.moves+' checked':events.length+' recorded'}</strong></div>
    <div><span>Dice</span><strong>{checked?(report.rolls?report.rolls+' checked':'Not needed'):(rolls.length?rolls.length+' to check':'Not needed yet')}</strong></div>
    <div><span>Onchain</span><strong>{covered?covered+' confirmed':bundle.checkpoint?'Pending check':'Awaiting recording'}</strong></div>
   </div>
   <button className="fair-primary" onClick={busy?stop:check} disabled={!events.length}>{busy?(progress?'Checking '+progress.checked+' / '+progress.total+' · Cancel':'Cancel check'):'Why verification is on hold'}</button>
   {progress&&<progress aria-label="Match verification progress" value={progress.checked} max={progress.total}/>}
   {checked&&<p className="fair-result" role="status">The signed actions follow this match’s published rules.{report.rolls?' The public randomness signatures and dice mapping also check out.':''}</p>}
   {checked&&!bundle.closure&&<p className="fair-small">This checks the available record. The match has not produced a signed final result yet.</p>}
   <nav className="fair-tabs" aria-label="Proof categories">{[['moves','Moves'],['dice','Dice'],['chain','Onchain']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   {tab==='moves'&&<div className="fair-timeline">{!events.length?<p>Moves will appear after play begins.</p>:events.map((event,index)=>{const actor=latest.actors.find(a=>a.id===event.signed.intent.actor);return <button className="fair-event" key={event.hash} onClick={()=>showStep(index+1)} disabled={!checked||busy}><span className="fair-number">{event.seq}</span><span><strong>{seat(actor?.seat)} · {describe(event)}</strong><small>{checked?'Signature and rules checked':'Recorded · Run verification to check'}{index<covered?' · Onchain confirmed':''}</small></span><span aria-hidden="true">{checked?'✓':'·'}</span></button>;})}</div>}
   {tab==='dice'&&<div className="fair-dice-list">{!rolls.length?<p>{latest.gameId==='dominion'?'No dice rolls are recorded yet.':'This game uses legal moves rather than dice.'}</p>:rolls.map(event=><article className="fair-roll" key={event.hash}><div><strong>Turn {event.seq}</strong><span>{checked?'Randomness checked':'Not checked yet'}</span></div><div className="fair-dice">{event.rng.values.map((v,n)=><b key={n}>{v}</b>)}</div><p>Public drand round {event.rng.round}</p><details><summary>How this roll is checked</summary><p>The verifier checks the pinned beacon signature, this turn’s signed request and the dice calculation. A request receipt is needed to prove its timing onchain.</p><code>{event.rng.intentHash}</code></details><button onClick={check} disabled={busy}>Check this match’s rolls</button></article>)}</div>}
   {tab==='chain'&&<div className="fair-chain"><h3>{chain?.status==='confirmed'?'Checkpoint confirmed':bundle.checkpoint?'Checkpoint needs checking':'Onchain recording awaits setup'}</h3><p>{covered?covered+' actions are included in the confirmed checkpoint.':chain?.message||'Independent verification is paused until matching published rules are restored. Saved records do not establish verified moves or onchain recording.'}</p>{checked&&report.rolls>0&&<p>{chain?.rollTimingVerified?'The covered dice requests were recorded before their beacon results.':'Dice request timing is currently attested by the game service; independent onchain timing has not been established.'}</p>}{chain?.explorerUrl&&<a className="fair-link" href={chain.explorerUrl} target="_blank" rel="noreferrer">View checkpoint on explorer ↗</a>}{bundle.checkpoint&&!chain?.explorerUrl&&NETWORKS[bundle.checkpoint.chainId]&&<a className="fair-link" href={NETWORKS[bundle.checkpoint.chainId].explorer+'/tx/'+bundle.checkpoint.transactionHash} target="_blank" rel="noreferrer">Inspect submitted transaction ↗</a>}<p className="fair-small">Checkpoint inclusion records the history. The app’s independent verifier checks game rules. This registry does not itself execute those rules or decide payouts.</p></div>}
   {checked&&<div className="fair-replay"><h3>Replay the checked record</h3><div className="fair-replay-controls"><button disabled={busy} onClick={()=>showStep(0)}>Start</button><input aria-label="Replay action" type="range" min="0" max={events.length} value={replay?.step??events.length} onChange={e=>showStep(Number(e.target.value))} disabled={busy}/><span>{replay?.step??events.length} / {events.length}</span></div>{replay&&<ReplayBoard replay={replay} assetBase={assetBase}/>}</div>}
   <div className="fair-export"><button onClick={download} disabled={busy}>Download proof</button>{shareMatch&&<button disabled={busy} onClick={()=>setShareConsent(v=>!v)}>Share proof</button>}</div>
   {shareConsent&&<div className="fair-share"><p>Anyone with this link can read the board, seats and move history. Chat and account credentials are excluded.</p><button disabled={busy} onClick={()=>run(async()=>setShare((await shareMatch(latest.matchId)).url))}>Create public link</button>{share&&<><a href={share} target="_blank" rel="noreferrer">{share}</a><button onClick={()=>navigator.clipboard?.writeText(share)}>Copy link</button></>}</div>}
   <details className="fair-technical"><summary>Technical details</summary><dl><dt>Match</dt><dd>{latest.matchId}</dd><dt>Rules build</dt><dd>{latest.rulesHash}</dd><dt>Header commitment</dt><dd>{bundle.headerHash}</dd><dt>Proof type</dt><dd>Account-authorized game keys · P-256 signatures · No wallet funds</dd><dt>Last move</dt><dd>{short(events.at(-1)?.hash)}</dd></dl></details>
  </>}
  {!!history.length&&<section className="fair-history"><h3>Your match proofs</h3>{history.map(match=><button key={match.matchId} disabled={busy} onClick={()=>run(async()=>install((await loadMatch(match.matchId)).bundle))}><span><strong>{names[match.gameId]||match.gameId}</strong><small>{match.moves} actions · {match.closed?'Finished':'In progress'}</small></span><span>View ›</span></button>)}</section>}
 </section>;
}
export function ReplayBoard({replay,assetBase}) {
 const board=replay.board,units=replay.pieces,byCell=new Map(board.cells.map(c=>[c.id,c]));
 const image=url=>{try{return new URL(url,assetBase||globalThis.location.href).href;}catch{return url;}};
 return <svg className="fair-replay-board" viewBox={board.viewBox} role="img" aria-label={'Checked board after action '+replay.step}>
  <rect x={board.viewBox.split(' ')[0]} y={board.viewBox.split(' ')[1]} width={board.viewBox.split(' ')[2]} height={board.viewBox.split(' ')[3]} fill="#d9eff6"/>
  {board.image&&<image href={image(board.image)} x={board.imageX||0} y={board.imageY||0} width={board.imageWidth} height={board.imageHeight} preserveAspectRatio="none"/>}
  {board.overlay&&<image href={image(board.overlay)} x="0" y="0" width={board.imageWidth} height={board.imageHeight} preserveAspectRatio="none"/>}
  {board.cells.map(c=><circle key={c.id} cx={c.x} cy={c.y} r="2" fill="#244556"/>)}
  {units.map(p=>{const c=byCell.get(p.cell);if(!c)return null;const size=c.size||board.size;return <g key={p.id} transform={p.rotation?`rotate(${p.rotation} ${c.x} ${c.y})`:undefined}><title>{seat(p.owner)} {p.label} · {c.label}</title><image href={image(p.sprite)} x={c.x-size/2} y={c.y-size/2} width={size} height={size}/></g>;})}
 </svg>;
}
