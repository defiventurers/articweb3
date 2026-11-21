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
        float up=smoothstep(-.06,.37,d.y);
        float lastLight=pow(max(dot(d,normalize(vec3(-.72,.06,-.69))),0.),12.);
        vec3 horizon=mix(vec3(.17,.24,.41),vec3(.66,.33,.30),lastLight);
        vec3 color=mix(horizon,vec3(.006,.016,.065),up);
        vec3 cell=floor(d*430.);
        float stars=fract(sin(dot(cell,vec3(12.7,31.2,67.3)))*43758.54);
        color+=step(.9986,stars)*smoothstep(.06,.48,d.y)*.45;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  });
  const sky = new T.Mesh(new T.SphereGeometry(165,40,20), material);
  sky.renderOrder = -10;
  scene.add(sky);
}

function streetLighting(scene, environment) {
  const lanterns=environment.colliders.obstacles.filter(b=>b.name.startsWith("lantern_"));
  const points=[], plane=new T.PlaneGeometry(2.9,2.9);
  const pool=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:`varying vec2 st; void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 st;void main(){float r=length(2.*st-1.);
      gl_FragColor=vec4(1.,.65,.27,.33*pow(max(0.,1.-r),2.));}`
  });
  const pools=new T.InstancedMesh(plane,pool,lanterns.length), matrix=new T.Matrix4();
  lanterns.forEach(({center:[x,,z]},i)=>{
    points.push(x,2.0,z);
    matrix.makeRotationX(-Math.PI/2);matrix.setPosition(x,.098,z);pools.setMatrixAt(i,matrix);
  });
  scene.add(pools);
  const positions=new T.BufferGeometry();
  positions.setAttribute("position",new T.Float32BufferAttribute(points,3));
  const glow=new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{height:{value:500}},
    vertexShader:`uniform float height;void main(){
      vec4 eye=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*eye;
      gl_PointSize=clamp(height*.9/max(.1,-eye.z),1.,96.);}`,
    fragmentShader:`void main(){float r=length(gl_PointCoord*2.-1.);
      gl_FragColor=vec4(1.,.65,.24,.40*pow(max(0.,1.-r),2.5));}`
  });
  const lights=new T.Points(positions,glow);
  lights.onBeforeRender=renderer=>{glow.uniforms.height.value=renderer.domElement.height;};
  scene.add(lights);
  environment.root.getObjectByName("lanterns_lightPool").visible=false;
}

export function buildScene(scene) {
  const environment = buildLanternHarborEnvironment(T);
  scene.add(environment.root);
  twilight(scene);
  streetLighting(scene, environment);
  for(const key of ["terrain","plaza","paths","sockets","dock","vegetation","ship","lanterns"]){
    const casts=["dock","vegetation","ship","lanterns"].includes(key);
    environment.root.getObjectByName(key).traverse(o=>{
      if(o.isMesh&&!o.material.transparent){o.castShadow=casts;o.receiveShadow=true;}
    });
  }
  scene.fog = new T.FogExp2(0x737fa5, .0115);
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
      object.castShadow=true;object.receiveShadow=true;
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
