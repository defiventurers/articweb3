// Android-only artwork calibration. Logical coordinates and rules stay canonical.
// These are measured pixel line centers in the 1254px generated guardian master.
export const YAN_YI_GUARDIAN_ART={
 id:'guardian-v3',nativeSize:1254,virtualSize:1536,runtimeSize:2048,
 x:[79,141,202,265,338,410,483,556,626,697,769.5,843,914,988,1048,1112,1175],
 y:[61,136,204,270,343,414.5,487,560,629,700,772,845,917,980,1048,1116,1178],
};
export function yanYiGuardianPoint(point){const a=YAN_YI_GUARDIAN_ART,scale=a.virtualSize/a.nativeSize;return{x:a.x[point.x]*scale,y:a.y[point.y]*scale};}
// Eight markers per side, clockwise. Each corner belongs to exactly one side.
export const YAN_YI_BOUNDARY_MARKERS=[
 ...Array.from({length:8},(_,i)=>({x:4+i,y:4,color:'blue'})),
 ...Array.from({length:8},(_,i)=>({x:12,y:4+i,color:'green'})),
 ...Array.from({length:8},(_,i)=>({x:12-i,y:12,color:'red'})),
 ...Array.from({length:8},(_,i)=>({x:4,y:12-i,color:'han'})),
];
