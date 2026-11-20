// Positions use metres in the XZ plane. The same footprints drive scenery and collision.
export const HALLS = [
  { key: "temple", name: "Chaturanga Temple", sign: "Chaturanga", x: -14, z: 0, width: 9, depth: 8,
    game: "arctic-dominion", note: "Chaturanga has roots in India. Its name refers to four divisions of an army. Arctic Dominion is our modern, dice-activated game for four kingdoms.",
    source: "https://www.nms.ac.uk/discover-catalogue/chess-and-ludo-board-games-with-south-asian-origins",
    actions: [
      ["Play Arctic Dominion", "game=arctic-dominion"],
      ["Learn piece movement", "game=arctic-dominion&movement=1"],
      ["Play local Chaturaji · modern team variant", "game=heritage-arcade&table=chaturaji"]
    ] },
  { key: "pavilion", name: "Xiangqi Pavilion", sign: "Xiangqi", x: -7.7, z: -15, width: 8.6, depth: 7,
    game: "heritage-arcade", note: "The river divides this Chinese chessboard. Each general commands from a palace. Open the Xiangqi table for its rules, bots, local seats and online setup.",
    actions: [["Open Xiangqi table", "game=heritage-arcade&table=xiangqi"]] },
  { key: "palace", name: "Shogi Palace", sign: "Shogi", x: 7.7, z: -15, width: 8.6, depth: 7,
    game: "shogi-frozen-shogunate", note: "On the Japanese nine-by-nine board, a captured piece can return on your side. The Frozen Shogunate table teaches drops and promotion and offers local, bot and online play.",
    actions: [["Open Frozen Shogunate", "game=shogi-frozen-shogunate"]] },
  { key: "council", name: "San You Qi Council Hall", sign: "San You Qi", x: 14, z: 0, width: 9, depth: 8,
    game: "san-you-qi", note: "Three Friends Chess brings three armies to a shared junction. Trace the paths between the three arms and meet the Fire and Flag pieces in the movement guide.",
    actions: [["Open Three Friends Chess", "game=san-you-qi"], ["Learn piece movement", "game=san-you-qi&movement=1"]] }
];

export const ARRIVAL = { x: 0, z: 21 };
export const ROOM_ENTRY = { x: 0, z: 5.6 };
export const door = hall => ({ x: hall.x, z: hall.z + hall.depth / 2 + 1.65 });
export const TABLE = { x: 0, z: -1, width: 4.4, depth: 3.6 };
export const LECTERN = { x: -4.6, z: -1, width: 1, depth: 1 };
export const LAMPS = [-3.6, 3.6].flatMap(x => [-21, -7, 8, 17].map(z => ({ x, z, width: .48, depth: .48 })));
export const TREES = [-20, 20].flatMap(x => [-21,-13,9,15].map(z => ({ x,z,width:1.4,depth:1.4 })));
const OUTSIDE = [...HALLS, ...LAMPS, ...TREES];
const INSIDE = [TABLE, LECTERN];
const insideRect = (p, r, margin) => Math.abs(p.x-r.x) < r.width/2+margin && Math.abs(p.z-r.z) < r.depth/2+margin;

export function isWalkable(p, room, radius = .42) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  const land = room ? Math.abs(p.x) <= 6.7-radius && Math.abs(p.z) <= 7.7-radius :
    (Math.abs(p.x) <= 22-radius && p.z >= -24+radius && p.z <= 22-radius) ||
    (Math.abs(p.x) <= 2.6-radius && p.z >= 20 && p.z <= 30-radius);
  return land && !(room ? INSIDE : OUTSIDE).some(rect => insideRect(p, rect, radius));
}

export function walk(p, dx, dz, room) {
  // Resolve axes separately so a player slides along walls.
  // Substeps also protect against low frame rates and diagonal corner tunnelling.
  const steps = Math.ceil(Math.hypot(dx,dz)/.2);
  for (let i=0; i<steps; i++) {
    if (isWalkable({ x:p.x+dx/steps, z:p.z },room)) p.x+=dx/steps;
    if (isWalkable({ x:p.x, z:p.z+dz/steps },room)) p.z+=dz/steps;
  }
}

export function nearby(p, room) {
  const sites = room ? [["table",TABLE,4.3],["heritage",LECTERN,2.2],["exit",{x:0,z:7},2.5]] :
    HALLS.map(h => [h.key,door(h),3.25]);
  return sites.map(([id,point,range])=>({id,dist:Math.hypot(p.x-point.x,p.z-point.z),range}))
    .filter(site=>site.dist<=site.range).sort((a,b)=>a.dist-b.dist)[0]?.id || null;
}
