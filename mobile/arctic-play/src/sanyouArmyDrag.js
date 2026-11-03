export function translateSanyouPoints(value,ids,dx,dy){
 const p=ids.map(id=>value.points[id]);dx=Math.max(-Math.min(...p.map(v=>v[0])),Math.min(1536-Math.max(...p.map(v=>v[0])),dx));dy=Math.max(-Math.min(...p.map(v=>v[1])),Math.min(1536-Math.max(...p.map(v=>v[1])),dy));
 return {...value,points:{...value.points,...Object.fromEntries(ids.map(id=>[id,value.points[id].map((n,i)=>Math.round((n+(i?dy:dx))*100)/100)]))}};
}
