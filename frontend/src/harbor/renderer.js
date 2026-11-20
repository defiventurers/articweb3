import * as T from "three";
import { buildScenery } from "./scenery.js";
import { HALLS, nearby, walk } from "./world.js";

const PALETTE = {
  polly: [0xf292b0,0xe76b97], retsba: [0xbc3835,0xefa447],
  pengu: [0x314975,0xf1f4fb], abster: [0x40814d,0xe2ab41]
};

// Rounded proxy volumes only. The selector displays the actual approved portraits.
function walkingProxy(id) {
  const group=new T.Group(), body=new T.Group(), [coat,crest]=PALETTE[id];
  group.add(body);
  const sphere=new T.SphereGeometry(1,16,12), mats=new Map();
  function oval(color,x,y,z,sx,sy,sz,parent=body) {
    if(!mats.has(color))mats.set(color,new T.MeshLambertMaterial({color}));
    const m=new T.Mesh(sphere,mats.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  }
  oval(coat,0,.78,0,.49,.70,.42);
  oval(0xfff1da,0,.71,.18,.41,.55,.31);
  oval(coat,0,1.43,0,.45,.43,.42);
  oval(0xfff1da,0,1.4,.22,.37,.30,.26);
  for(const side of [-1,1])oval(0x273345,side*.16,1.48,.445,.045,.063,.032);
  oval(0xe89f45,0,1.37,.47,.13,.085,.11);
  for(let i=0;i<3;i++) {
    const feather=oval(crest,(i-1)*.095,1.79-i*.025,-.06,.09,.20,.095);
    feather.rotation.x=-.48-i*.12;
  }
  const wings=[-1,1].map(s=>oval(coat,s*.44,.85,-.03,.15,.39,.17));
  wings.forEach((m,i)=>m.rotation.z=i===0?-.22:.22);
  const feet=[-1,1].map(s=>oval(0xe2a247,s*.22,.13,.11,.19,.11,.27,group));
  const shadow=new T.Mesh(new T.CircleGeometry(.57,22),new T.MeshBasicMaterial({color:0x27445b,opacity:.29,transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;group.add(shadow);
  return {group,animate(phase,weight,reduced){
    body.position.y=reduced?0:Math.abs(Math.sin(phase))*.055*weight;
    body.rotation.z=reduced?0:Math.sin(phase)*.055*weight;
    feet.forEach((m,i)=>{m.position.z=.11+Math.sin(phase+i*Math.PI)*.14*weight;});
    wings.forEach((m,i)=>{m.rotation.x=reduced?0:Math.sin(phase+i*Math.PI)*.28*weight;});
  }};
}

const KEYS={KeyW:"up",ArrowUp:"up",KeyA:"left",ArrowLeft:"left",KeyS:"down",ArrowDown:"down",KeyD:"right",ArrowRight:"right"};
function cameraBlocked(x,z,room) {
  if(room)return Math.abs(x)>6.4 || z < -7.35 || z > 12;
  return HALLS.some(h=>Math.abs(x-h.x)<h.width/2+1 && Math.abs(z-h.z)<h.depth/2+1);
}

export function mountWorld(canvas,{room,avatar,position,input,preferences,onNear,onInteract,onMenu,onFailure}) {
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:"low-power"});
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(55,1,.08,240);
  const events=new AbortController(), options={signal:events.signal};
  let frame=0,resize,terminated=false;
  function dispose(){
    if(terminated)return;terminated=true;
    cancelAnimationFrame(frame);events.abort();resize?.disconnect();
    const resources=new Set();
    scene.traverse(obj=>{
      if(obj.isInstancedMesh) obj.dispose();
      if(obj.geometry)resources.add(obj.geometry);
      for(const m of [].concat(obj.material||[])){if(m.map)resources.add(m.map);resources.add(m);}
    });
    resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();
  }
  try{
    buildScenery(scene,room);
    const avatarMesh=walkingProxy(avatar);scene.add(avatarMesh.group);
    const keys=new Set(),look=new T.Vector3(),goal=new T.Vector3();
    const p=position.current, controller=input.current;
    let yaw=0, facing=Math.PI, phase=0,weight=0,drag=null,previous=null,lastNear,wasPaused=false,lastDpr=0;
    const release=()=>{keys.clear();controller.touch.clear();drag=null;};
    controller.release=release;
    const keydown=e=>{
      if(controller.paused || document.hidden || e.ctrlKey || e.metaKey || e.altKey)return;
      if(KEYS[e.code]){e.preventDefault();keys.add(KEYS[e.code]);}
      if(e.code==="KeyE"&&!e.repeat){e.preventDefault();onInteract(nearby(p,room));}
      if(e.code==="Escape"&&!e.repeat){e.preventDefault();release();onMenu();}
    };
    window.addEventListener("keydown",keydown,options);
    window.addEventListener("keyup",e=>keys.delete(KEYS[e.code]),options);
    window.addEventListener("blur",release,options);
    document.addEventListener("visibilitychange",release,options);
    canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();dispose();onFailure();},options);
    canvas.addEventListener("pointerdown",e=>{if(!controller.paused){drag={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);}},options);
    canvas.addEventListener("pointermove",e=>{if(drag?.id===e.pointerId&&!controller.paused){yaw-=(e.clientX-drag.x)*.006;drag.x=e.clientX;}},options);
    canvas.addEventListener("lostpointercapture",()=>{drag=null;},options);
    function size(){
      const {width,height}=canvas.getBoundingClientRect();
      renderer.setPixelRatio(lastDpr=Math.min(window.devicePixelRatio||1,preferences.current.low?1:1.5));
      renderer.setSize(Math.max(1,width),Math.max(1,height),false);
      camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();
    }
    resize=new ResizeObserver(size);resize.observe(canvas);size();
    function render(now){
      frame=requestAnimationFrame(render);
      if(document.hidden || controller.paused && wasPaused){previous=null;return;}
      if(previous!==null && now-previous<1000/30-1)return;
      const dt=previous===null ? 0 : Math.min(.06,(now-previous)/1000);
      previous=now;
      if(controller.paused)release();
      wasPaused=controller.paused;
      const {low,reduced}=preferences.current;
      if(lastDpr!==Math.min(window.devicePixelRatio||1,low?1:1.5))size();
      const active=k=>Number(keys.has(k)||controller.touch.has(k));
      const dx=active("right")-active("left"), dz=active("down")-active("up"),len=Math.hypot(dx,dz);
      const vx=dx*Math.cos(yaw)+dz*Math.sin(yaw),vz=dz*Math.cos(yaw)-dx*Math.sin(yaw);
      const beforeX=p.x,beforeZ=p.z;
      if(len && !controller.paused){walk(p,vx/len*dt*5.8,vz/len*dt*5.8,room);facing=Math.atan2(vx,vz);}
      const moving=Math.hypot(p.x-beforeX,p.z-beforeZ)>.0001;
      weight=T.MathUtils.damp(weight,Number(moving),12,dt);phase+=dt*10;
      avatarMesh.group.position.set(p.x,room ? .07 : .23,p.z);
      const turn=Math.atan2(Math.sin(facing-avatarMesh.group.rotation.y),Math.cos(facing-avatarMesh.group.rotation.y));
      avatarMesh.group.rotation.y+=turn*(reduced||!dt?1:1-Math.exp(-dt*17));
      avatarMesh.animate(phase,weight,reduced);
      const near=nearby(p,room);
      if(near!==lastNear){lastNear=near;onNear(near);}
      const sx=Math.sin(yaw),sz=Math.cos(yaw),distance=room?4.9:7.3;
      let reach=.45;
      for(let t=.55;t<=distance;t+=.18){if(cameraBlocked(p.x+sx*t,p.z+sz*t,room))break;reach=t;}
      goal.set(p.x+sx*reach,room?2.2+reach*.24:2.25+reach*.22,p.z+sz*reach);
      // Snap inward around a wall and damp only clear paths.
      if(reduced || !dt || reach<distance-.4 || cameraBlocked(camera.position.x,camera.position.z,room))camera.position.copy(goal);
      else camera.position.lerp(goal,1-Math.exp(-dt*12));
      look.set(p.x-sx*2.1,room?1.4:2.7,p.z-sz*2.1);camera.lookAt(look);
      renderer.render(scene,camera);
    }
    render(performance.now());
    return ()=>{release();delete controller.release;dispose();};
  }catch(error){dispose();throw error;}
}
