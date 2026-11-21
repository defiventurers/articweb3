import * as T from "three";
import { buildLanternHarborEnvironment, shoreline } from "./assets/lantern-harbor-environment.mjs";
import { buildChaturangaTemple } from "./assets/chaturanga-temple.mjs";
import { buildXiangqiPavilion } from "./assets/xiangqi-pavilion.mjs";
import { buildShogiPalace } from "./assets/shogi-palace.mjs";
import { buildSanYouQiCouncil } from "./assets/san-you-qi-council.mjs";
import { HALLS, door } from "./world.js";
import { worldBoxes } from "./navigation.js";

const halls = {
  temple: [buildChaturangaTemple, .29], pavilion: [buildXiangqiPavilion, .55],
  palace: [buildShogiPalace, 0], council: [buildSanYouQiCouncil, .34]
};

function twilight(scene) {
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    vertexShader: `varying vec3 direction;
      void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 direction;
      void main(){
        vec3 d=normalize(direction);
        float up=smoothstep(-.035,.58,d.y);
        float lastLight=pow(max(dot(d,normalize(vec3(-.72,.06,-.69))),0.),12.);
        vec3 horizon=mix(vec3(.25,.40,.58),vec3(.78,.45,.34),lastLight);
        gl_FragColor=vec4(mix(horizon,vec3(.009,.035,.11),up),1.);
        #include <colorspace_fragment>
      }`
  });
  const sky = new T.Mesh(new T.SphereGeometry(165,40,20), material);
  sky.renderOrder = -10;
  scene.add(sky);
}

export function buildScene(scene) {
  const environment = buildLanternHarborEnvironment(T);
  scene.add(environment.root);
  twilight(scene);
  scene.fog = new T.FogExp2(0x849fbb, .009);
  const { obstacles, boundaries } = environment.colliders;
  const solids = worldBoxes([...obstacles, ...boundaries], environment.root.position);
  const sites = [], roofs = [], floors = [];
  // Probe only the hall under the avatar. The short downward ray picks actual stair treads.
  const ray = new T.Raycaster(new T.Vector3(), new T.Vector3(0,-1,0), 0, 1.15);
  const hits = [];
  for (const hall of HALLS) {
    const [makeHall, lift] = halls[hall.key];
    const asset = makeHall(T);
    asset.root.position.copy(environment.anchors[hall.key + "Socket"].position);
    asset.root.position.y += lift;
    scene.add(asset.root);
    asset.root.updateMatrixWorld(true);
    solids.push(...worldBoxes(asset.colliders, asset.root.position));
    const marker = asset.anchors.door.getWorldPosition(new T.Vector3());
    sites.push({id:hall.key, ...door(hall), range:3.2}, {id:hall.key, x:marker.x, z:marker.z, range:2.1});
    roofs.push({x:hall.x, z:hall.z, y:7.75, rx:hall.width/2, rz:hall.depth/2, ry:4.55});
    const meshes = [];
    asset.root.traverse(object => {
      if (!object.isMesh) return;
      const bounds = new T.Box3().setFromObject(object);
      if (bounds.min.y <= .82 && bounds.max.y >= 0) meshes.push(object);
    });
    floors.push({hall, meshes});
  }
  let lastMotion;
  return {
    solids, sites, cameraBoxes: [...solids, ...roofs],
    onLand(x,z,r) {
      if (Math.abs(x) <= 2.81-r && z >= 20 && z <= 33-r) return true;
      if (Math.abs(x)>22-r || z < -24+r) return false;
      const end=shoreline.findIndex(([east]) => east >= x);
      const [x0,z0]=shoreline[end-1], [x1,z1]=shoreline[end];
      return z <= z0 + (x-x0)/(x1-x0)*(z1-z0) - r;
    },
    ground(x,z) {
      const patch = floors.find(({hall:h}) => Math.abs(x-h.x)<h.width/2+.1 && Math.abs(z-h.z)<h.depth/2+.1);
      if (patch) {
        ray.ray.origin.set(x,.84,z);
        hits.length=0;ray.intersectObjects(patch.meshes,false,hits);
        const hit=hits.find(h => h.face.normal.y>.65 && h.point.y>=0);
        return hit?.point.y ?? .04;
      }
      return z>=21.45 && Math.abs(x)<2.9 ? .14 : .062;
    },
    update(dt, still) {
      if (lastMotion!==still) { environment.root.userData.setReducedMotion(still); lastMotion=still; }
      if (!still) environment.root.userData.update(dt);
    }
  };
}
