import React from 'react';
const star=(cx,cy,r,angle=-90)=>Array.from({length:10},(_,i)=>{const a=(angle+i*36)*Math.PI/180,q=i%2?r*(3-Math.sqrt(5))/2:r;return (cx+Math.cos(a)*q).toFixed(3)+','+(cy+Math.sin(a)*q).toFixed(3);}).join(' ');
// Flat period symbols, not facsimiles of particular physical flags.
export function PassportFlag({country,place}){
 return <svg viewBox="0 0 30 20" role="img" aria-label={place+' flag symbol, used during this edition’s period'}>
  {country==='japan'?<><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/></>:<><rect width="30" height="20" fill="#de2910"/><polygon points={star(5,5,3)} fill="#ffde00"/>{[[10,2],[12,4],[12,7],[10,9]].map(([cx,cy])=><polygon key={cx+','+cy} points={star(cx,cy,1,Math.atan2(5-cy,5-cx)*180/Math.PI)} fill="#ffde00"/>)}</>}
 </svg>;
}
