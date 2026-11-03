// The uploaded GitHub board and the published frontend's 9x9 grid calibration.
// Keep cells square-relative; this artwork is not a source of game rules.
export const SHOGI_BOARD_ART={
  image:'art/shogi/board-github-v1.png',width:1536,height:1536,
  grid:{left:.0945,top:.0813,width:.813,height:.8385},
};
export function shogiBoardGeometry(){
  const {image,width,height,grid}=SHOGI_BOARD_ART;
  return {viewBox:`0 0 ${width} ${height}`,width,height,size:136,image,imageWidth:width,imageHeight:height,
    cells:Array.from({length:81},(_,i)=>({id:String(i),
      x:(grid.left+(i%9+.5)*grid.width/9)*width,
      y:(grid.top+(Math.floor(i/9)+.5)*grid.height/9)*height,
      label:`File ${9-i%9}, rank ${Math.floor(i/9)+1}`,
    })),
  };
}
