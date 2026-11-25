import * as T from "three";
import { cameraBlocked, nearby, walk } from "./navigation.js";

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
export function mountWorld(canvas,{buildScene,room,avatar,position,input,preferences,onNear,onInteract,onMenu,onFailure}) {
  const renderer=new T.WebGLRenderer({canvas,antialias:!preferences.current.low,powerPreference:"low-power"});
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
    resources.forEach(r=>r.dispose());scene.traverse(o=>o.shadow?.dispose());renderer.dispose();renderer.forceContextLoss();
  }
  try{
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=room?1.18:1.12;
    renderer.shadowMap.enabled=!preferences.current.low;
    renderer.shadowMap.type=T.PCFShadowMap;
    // Architecture is static. Render the daylight shadow atlas once per scene or quality change.
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    scene.add(new T.HemisphereLight(room?0xe1efff:0xc6d8ff,0x393d66,room?1.9:1.24));
    const key=new T.DirectionalLight(0xffdfb3,room?2.5:2.05), rim=new T.DirectionalLight(0x89b6ff,.68);
    key.position.set(-19,24,13);key.castShadow=!room;
    key.shadow.mapSize.set(1536,1536);key.shadow.bias=-.00025;key.shadow.normalBias=.025;
    Object.assign(key.shadow.camera,{left:-31,right:31,top:33,bottom:-33,near:.5,far:90});
    key.shadow.camera.updateProjectionMatrix();
    rim.position.set(15,10,-18);scene.add(key,rim);
    const layout=buildScene(scene);
    const avatarMesh=walkingProxy(avatar);scene.add(avatarMesh.group);
    const keys=new Set(),look=new T.Vector3(),goal=new T.Vector3();
    const p=position.current, controller=input.current;
    let distance=room?4.9:7.3, pitch=.24, yaw=0, facing=Math.PI, phase=0,weight=0,drag=null,previous=null,lastNear,wasPaused=false,lastDpr=0;
    let floor=layout.ground(p.x,p.z), lastX=p.x, lastZ=p.z;
    const release=()=>{keys.clear();controller.touch.clear();drag=null;};
    controller.release=release;
    const keydown=e=>{
      if(controller.paused || document.hidden || e.ctrlKey || e.metaKey || e.altKey)return;
      if(KEYS[e.code]){e.preventDefault();keys.add(KEYS[e.code]);}
      if(e.code==="KeyE"&&!e.repeat){e.preventDefault();onInteract(nearby(layout,p));}
      if(e.code==="Escape"&&!e.repeat){e.preventDefault();release();onMenu();}
    };
    window.addEventListener("keydown",keydown,options);
    window.addEventListener("keyup",e=>keys.delete(KEYS[e.code]),options);
    window.addEventListener("blur",release,options);
    document.addEventListener("visibilitychange",release,options);
    canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();dispose();onFailure();},options);
    canvas.addEventListener("pointerdown",e=>{if(!controller.paused){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}},options);
    canvas.addEventListener("pointermove",e=>{if(drag?.id===e.pointerId&&!controller.paused){yaw-=(e.clientX-drag.x)*.006;pitch=T.MathUtils.clamp(pitch+(e.clientY-drag.y)*.004,-.05,room?.55:.85);drag.x=e.clientX;drag.y=e.clientY;}},options);
    canvas.addEventListener("wheel",e=>{
      if(controller.paused)return;
      e.preventDefault();
      distance=T.MathUtils.clamp(distance+Math.sign(e.deltaY)*.85,room?2.5:3.3,room?6.4:14);
    },{...options,passive:false});
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
      if(renderer.shadowMap.enabled===low){
        renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=!low;
      }
      if(lastDpr!==Math.min(window.devicePixelRatio||1,low?1:1.5))size();
      const active=k=>Number(keys.has(k)||controller.touch.has(k));
      const dx=active("right")-active("left"), dz=active("down")-active("up"),len=Math.hypot(dx,dz);
      const vx=dx*Math.cos(yaw)+dz*Math.sin(yaw),vz=dz*Math.cos(yaw)-dx*Math.sin(yaw);
      const beforeX=p.x,beforeZ=p.z;
      if(len && !controller.paused){walk(layout,p,vx/len*dt*5.8,vz/len*dt*5.8);facing=Math.atan2(vx,vz);}
      const moving=Math.hypot(p.x-beforeX,p.z-beforeZ)>.0001;
      weight=T.MathUtils.damp(weight,Number(moving),12,dt);phase+=dt*10;
      if(p.x!==lastX || p.z!==lastZ){
        floor=layout.ground(p.x,p.z);lastX=p.x;lastZ=p.z;
      }
      avatarMesh.group.position.set(p.x,floor,p.z);
      const turn=Math.atan2(Math.sin(facing-avatarMesh.group.rotation.y),Math.cos(facing-avatarMesh.group.rotation.y));
      avatarMesh.group.rotation.y+=turn*(reduced||!dt?1:1-Math.exp(-dt*17));
      avatarMesh.animate(phase,weight,reduced);
      const near=nearby(layout,p);
      if(near!==lastNear){lastNear=near;onNear(near);}
      const sx=Math.sin(yaw),sz=Math.cos(yaw);
      const shoulder=floor+1.47, slope=Math.tan(pitch);
      let reach=.27;
      for(let t=.34;t<=distance;t+=.14){
        if(cameraBlocked(layout,p.x+sx*t,shoulder+slope*t,p.z+sz*t))break;
        reach=t;
      }
      goal.set(p.x+sx*reach,shoulder+slope*reach,p.z+sz*reach);
      if(reduced || !dt || reach<distance-.35 || camera.position.distanceTo(goal)>2 ||
        cameraBlocked(layout,camera.position.x,camera.position.y,camera.position.z))camera.position.copy(goal);
      else camera.position.lerp(goal,1-Math.exp(-dt*14));
      look.set(p.x-sx*2.15,shoulder+(room?.02:.58),p.z-sz*2.15);
      camera.lookAt(look);
      layout.update(dt,reduced||low,camera);
      renderer.render(scene,camera);
    }
    render(performance.now());
    return ()=>{release();delete controller.release;dispose();};
  }catch(error){dispose();throw error;}
}
