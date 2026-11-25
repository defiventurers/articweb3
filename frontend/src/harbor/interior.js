import * as T from "three";
import { buildChaturangaInterior } from "./assets/chaturanga-interior.mjs";
import { worldBoxes } from "./navigation.js";

export function buildScene(scene) {
  const asset = buildChaturangaInterior(T);
  scene.background = new T.Color(0x13273b);
  scene.add(asset.root);
  const solids = worldBoxes(asset.colliders, asset.root.position);
  const sites = [["exit","exit",2.65],["table","gameTable",3.6],
    ["heritage","heritagePedestal",2.05],["tutorial","tutorial",2.05]].map(([id,key,range]) => {
    const {x,z} = asset.anchors[key].position;
    return {id,x,z,range};
  });
  const south = asset.root.getObjectByName("cameraFacingWalls");
  const {width,depth} = asset.root.userData.room;
  const table = asset.anchors.gameTable.position;
  return {
    solids, sites,
    cameraBoxes: solids.filter(box => !["southWestWall","southEastWall","entryLintel"].includes(box.name)),
    onLand(x,z,r) {return Math.abs(x) <= width/2-r && Math.abs(z) <= depth/2-r;},
    ground(x,z) {
      const edge=Math.max(Math.abs(x-table.x),Math.abs(z-table.z));
      const onRamp=Math.min(Math.abs(x-table.x),Math.abs(z-table.z))<.93;
      return .023 + (edge<2.5 ? .19 : onRamp ? .19*T.MathUtils.clamp((3.29-edge)/.79,0,1) : 0);
    },
    update(dt, still, camera) { south.visible = camera.position.z < 7.5; }
  };
}
