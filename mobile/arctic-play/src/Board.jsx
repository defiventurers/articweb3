import React,{useMemo,useRef,useState} from 'react';
import {board,pieces,COLORS,seatName} from './games.ts';
export function Board({id,state,legal,selected,onSelect,onTarget,canAct}){
  const geometry=useMemo(()=>board(id),[id]);
  const units=useMemo(()=>pieces(id,state),[id,state]);
  const byCell=useMemo(()=>new Map(units.map(p=>[p.cell,p])),[units]);
  const destinations=useMemo(()=>new Set(legal.filter(a=>a.source===selected).map(a=>a.target)),[legal,selected]);
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
  const pointers=useRef(new Map()),gesture=useRef(null),dragged=useRef(false),viewport=useRef(null);
  const last=state.lastMove||state.lastAction;
  const activate=cell=>{if(dragged.current||!canAct)return;if(destinations.has(cell.id)){onTarget(cell.id);return;}const unit=byCell.get(cell.id);if(unit&&legal.some(a=>a.source===unit.source))onSelect(unit.source);else onSelect(null);};
  const start=e=>{
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged.current=false;
    const points=[...pointers.current.values()];
    if(points.length===2){gesture.current={distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),zoom,pan};e.currentTarget.setPointerCapture(e.pointerId);}
    else gesture.current={x:e.clientX,y:e.clientY,pan};
  };
  const move=e=>{
    if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const points=[...pointers.current.values()],base=gesture.current;if(!base)return;
    if(points.length===2&&base.distance){dragged.current=true;setZoom(Math.max(1,Math.min(3,base.zoom*Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)/base.distance)));}
    else if(zoom>1&&base.x!==undefined){const dx=e.clientX-base.x,dy=e.clientY-base.y;if(Math.abs(dx)+Math.abs(dy)>8){dragged.current=true;e.currentTarget.setPointerCapture(e.pointerId);const rect=viewport.current.getBoundingClientRect(),limitX=rect.width*(zoom-1)/2,limitY=rect.height*(zoom-1)/2;setPan({x:Math.max(-limitX,Math.min(limitX,base.pan.x+dx)),y:Math.max(-limitY,Math.min(limitY,base.pan.y+dy))});}}
  };
  const end=e=>{pointers.current.delete(e.pointerId);if(!pointers.current.size)gesture.current=null;};
  const reset=()=>{setZoom(1);setPan({x:0,y:0});};
  const [, ,width,height]=geometry.viewBox.split(' ').map(Number);
  return <section className="board-section">
    <div className="board-viewport" ref={viewport} style={{aspectRatio:`${width}/${height}`}} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <svg data-testid="game-board" className="game-board" viewBox={geometry.viewBox} aria-label={`${id} board`} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
        {geometry.image?<image href={geometry.image} x={geometry.imageX||0} y={geometry.imageY||0} width={geometry.imageWidth} height={geometry.imageHeight} preserveAspectRatio="none"/>:<>
          <defs><linearGradient id="wood" x2="1" y2="1"><stop stopColor="#e7c68a"/><stop offset="1" stopColor="#bd8e4d"/></linearGradient></defs>
          <rect width="900" height="1000" rx="24" fill="url(#wood)"/><rect x="40" y="90" width="820" height="820" fill="#f4d7a2" stroke="#9b692e" strokeWidth="4"/>
          {Array.from({length:10},(_,i)=><React.Fragment key={i}><path d={`M ${45+i*90} 95 V 905 M 45 ${95+i*90} H 855`} stroke="#73552d" strokeWidth="2"/></React.Fragment>)}
          {[3,6].flatMap(r=>[3,6].map(c=><circle key={`${r}-${c}`} cx={45+c*90} cy={95+r*90} r="6" fill="#73552d"/>))}
          <text x="450" y="52" textAnchor="middle" fill="#72502e" fontSize="26" fontWeight="700">SHOGI</text>
        </>}
        {geometry.cells.map(cell=>{
          const unit=byCell.get(cell.id),isSelected=unit?.source===selected,highlight=destinations.has(cell.id),inherited=unit&&unit.owner&&unit.origin!==unit.owner,half=geometry.size/2;
          return <g key={cell.id} data-cell={cell.id} role="button" aria-label={`${cell.label}${unit?`, ${seatName(id,unit.owner||unit.origin)} ${unit.label}`:''}${highlight?', legal destination':''}`} tabIndex={highlight||isSelected?0:-1} onClick={()=>activate(cell)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(cell);}}}>
            <circle cx={cell.x} cy={cell.y} r={half*.68} fill="transparent"/>
            {isSelected&&<circle cx={cell.x} cy={cell.y} r={half*1.04} fill="#389cf470" stroke="#b9efff" strokeWidth="5"/>}
            {unit&&<>
              {inherited&&<circle cx={cell.x} cy={cell.y} r={half*1.01} fill="none" stroke={COLORS[unit.owner]} strokeWidth="8"/>}
              <image href={unit.sprite} x={cell.x-half} y={cell.y-half} width={geometry.size} height={geometry.size} opacity={unit.inactive ? .45 : 1} transform={unit.rotation?`rotate(${unit.rotation} ${cell.x} ${cell.y})`:undefined} pointerEvents="none"/>
              {inherited&&<circle cx={cell.x+half*.67} cy={cell.y+half*.65} r={half*.2} fill={COLORS[unit.owner]} stroke="white" strokeWidth="2"/>}
            </>}
            {highlight&&(unit?<circle cx={cell.x} cy={cell.y} r={half*.99} fill="#ff6e6322" stroke="#ff9a76" strokeWidth="6"/>:<circle cx={cell.x} cy={cell.y} r={half*.29} fill="#78d2ff" stroke="#fff" strokeWidth="3"/>)}
            <circle cx={cell.x} cy={cell.y} r={half*.72} fill="transparent"/>
          </g>;
        })}
      </svg>
    </div>
    <div className="board-tools"><span>{zoom>1?'Drag to pan':'Pinch to zoom'} · {Math.round(zoom*100)}%</span><div><button onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label="Zoom in">＋</button><button onClick={()=>{setZoom(value=>Math.max(1,value-.5));setPan({x:0,y:0});}} aria-label="Zoom out">−</button><button onClick={reset}>Fit</button></div></div>
  </section>;
}
