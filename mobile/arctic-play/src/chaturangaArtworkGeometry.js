// Measured against APPROVED 865×1536 plate; only rendered coordinates change.
// Top four ranks retain their accepted positions. Lower ranks follow painted edges
// 782/869/958/1046/1137 rather than extrapolating an ideal uniform grid.
export function calibrateChaturangaGeometry(geometry){
 const [x,y,width,height]=geometry.viewBox.split(' ').map(Number);
 const lowerCenters=[825.5,913.5,1002,1091.5];
 return {...geometry,cells:geometry.cells.map(cell=>{
  const row=Math.max(0,Math.min(7,Math.floor((cell.y-y)/height*8+1e-8)));
  return row<4?cell:{...cell,y:y+(lowerCenters[row-4]-429)/708*height};
 })};
}
