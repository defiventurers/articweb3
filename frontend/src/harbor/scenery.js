import * as T from "three";
import { HALLS, LAMPS, TREES, TABLE, LECTERN } from "./world.js";

const ice = 0x76c8de, snow = 0xf0f8ff, gold = 0xe1ae59, navy = 0x254362, stone = 0x879eb6;
const cedar = 0x67483f, red = 0xa54345, light = 0xffdd89;

// One instanced draw per primitive and material family, including lantern glass.
function workshop(scene) {
  const shapes = {
    box: new T.BoxGeometry(), round: new T.CylinderGeometry(.5,.5,1,16),
    cone: new T.ConeGeometry(.5,1,8), peak: new T.ConeGeometry(.5,1,5),
    hip: new T.CylinderGeometry(.23,.72,1,4).rotateY(Math.PI/4),
    gem: new T.OctahedronGeometry(.5), ball: new T.SphereGeometry(.5,12,8),
  };
  const buckets = new Map(), pose = new T.Object3D();
  function part(kind,color,x,y,z,w,h,d,ry=0,rz=0,unlit=false) {
    const key = kind + (unlit ? "-lamp" : "");
    if (!buckets.has(key)) buckets.set(key,{kind,unlit,entries:[]});
    pose.position.set(x,y,z); pose.scale.set(w,h,d); pose.rotation.set(0,ry,rz);
    pose.updateMatrix();
    buckets.get(key).entries.push([pose.matrix.clone(), new T.Color(color)]);
  }
  function finish() {
    for (const {kind,unlit,entries} of buckets.values()) {
      const material=unlit ? new T.MeshBasicMaterial() : new T.MeshLambertMaterial({flatShading:true});
      const mesh=new T.InstancedMesh(shapes[kind],material,entries.length);
      entries.forEach(([matrix,color],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color);});
      scene.add(mesh);
    }
    for (const [key,geo] of Object.entries(shapes)) if (!buckets.has(key)&&!buckets.has(key+"-lamp")) geo.dispose();
  }
  return {part,finish};
}

function sign(scene,text,x,y,z,width,angle=0) {
  const c=document.createElement("canvas"); c.width=512; c.height=96;
  const g=c.getContext("2d");
  g.fillStyle="#172c45";g.fillRect(0,0,512,96);
  g.strokeStyle="#dcb57a";g.lineWidth=5;g.strokeRect(4,4,504,88);
  g.font="bold 54px Georgia";g.fillStyle="#ffe7a7";g.textAlign="center";g.textBaseline="middle";
  g.fillText(text,256,49,485);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const plaque=new T.Mesh(new T.PlaneGeometry(width,width*96/512),new T.MeshBasicMaterial({map}));
  plaque.position.set(x,y,z);plaque.rotation.y=angle;scene.add(plaque);
}

function lantern(p,x,z,height=2.9,base=0) {
  p("round",stone,x,base+.12,z,.65,.24,.65);
  p("round",navy,x,base+height*.44,z,.15,height*.88,.15);
  p("hip",gold,x,base+height-.42,z,.7,.17,.7);
  p("round",light,x,base+height-.07,z,.48,.65,.48,0,0,true);
  for(const a of [-.19,.19]) for(const b of [-.19,.19]) p("box",cedar,x+a,base+height-.07,z+b,.043,.68,.043);
  p("hip",navy,x,base+height+.35,z,.82,.22,.82);
  p("gem",gold,x,base+height+.56,z,.17,.35,.17);
}

function facade(scene,p,hall) {
  const {x,z,width:w,depth:d,key}=hall, front=z+d/2, temple=key==="temple";
  const wall=temple?0x90aacb:key==="pavilion"?red:key==="palace"?cedar:0x397580;
  p("box",stone,x,.26,z,w,.52,d);
  p("box",ice,x,.56,z,w+.25,.14,d+.25);
  p("box",wall,x,2.05,z,w-.65,2.95,d-.55);
  for(const side of [-1,1]){
    const wx=x+side*w*.32;
    p("box",gold,wx,2.0,front-.24,1.55,1.88,.14);
    p("box",light,wx,2.0,front-.14,1.32,1.62,.09,0,0,true);
    for(const offset of [-.42,0,.42])p("box",cedar,wx+offset,2,front-.075,.06,1.68,.06);
    p("box",cedar,wx,2,front-.06,1.4,.09,.05);
    p("round",gold,x+side*1.5,1.67,front,.35,2.65,.35);
    lantern(p,x+side*(w/2-.5),front,2.5,.4);
  }
  p("box",navy,x,1.55,front-.17,2.55,2.5,.24);
  p("box",cedar,x,1.5,front-.02,2.03,2.25,.18);
  p("box",gold,x,1.5,front+.095,.06,2.25,.06);
  for(let step=0;step<3;step++) p("box",step===2?ice:snow,x,.07+step*.075,front+.82-step*.3,3.7-step*.16,.14+step*.15,.42);
  if(temple){
    for(let tier=0;tier<5;tier++){
      const s=1-tier*.15, y=3.45+tier*.85;
      p("hip",0x738faf,x,y+.33,z,w*s,1.05,d*s);
      p("box",gold,x,y+.05,z,w*s,.17,d*s);
      p("box",snow,x,y+.17,z,w*s+.12,.14,d*s+.12);
      for(let j=-1;j<=1;j++)p("gem",ice,x+j*w*s*.29,y+.52,z+d*s*.38,.46,.62,.33);
    }
    for(const offset of [-.85,0,.85])p("round",gold,x+offset,7.65,z,.46,.27,.46);
    p("gem",gold,x,8.1,z,.72,1.1,.72);
  }else if(key==="council"){
    for(const off of [-2.8,0,2.8]){
      const y=off===0?4.65:3.8;
      p("round",wall,x+off,y-.8,z,3.4,1.3,3.4);
      p("cone",navy,x+off,y+.46,z,4.7,2.05,4.7);
      p("cone",snow,x+off,y+.85,z,3.22,1.45,3.22);
      p("gem",gold,x+off,y+1.72,z,.36,.69,.36);
    }
  }else{
    const tiers=key==="pavilion"?2:1;
    for(let t=0;t<tiers;t++){
      const s=1-t*.38,y=3.55+t*1.46;
      p("hip",navy,x,y+.58,z,(w+1.3)*s,1.55,(d+1.2)*s);
      p("hip",snow,x,y+.85,z,(w+.65)*s,1.30,(d+.6)*s);
      p("box",gold,x,y-.09,z,(w+1.3)*s,.12,(d+1.15)*s);
      if(key==="pavilion") for(const side of [-1,1])for(const end of [-1,1])
        p("gem",gold,x+side*(w+.8)*s/2,y+.12,z+end*(d+.65)*s/2,.36,.88,.36,0,-side*.48);
    }
    if(key==="palace")p("box",cedar,x,5.13,z,w*.57,.28,.4);
  }
  sign(scene,hall.sign,x,3.17,front+.17,Math.min(w*.72,5.7));
}

function sky(scene) {
  const mesh=new T.Mesh(new T.SphereGeometry(145,48,20),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,
    vertexShader:'varying vec3 dir; void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec3 dir;
      void main(){
        vec3 d=normalize(dir);float h=max(d.y,0.);
        vec3 col=mix(vec3(.71,.70,.82),vec3(.075,.145,.32),smoothstep(-.06,.44,h));
        col=mix(col,vec3(.018,.046,.15),smoothstep(.30,.85,h));
        float a=atan(d.x,d.z), wave=.27+.09*sin(a*3.)+.05*sin(a*8.+.7);
        float ribbon=exp(-abs(h-wave)*19.)*(.54+.18*sin(28.*a)+.14*sin(63.*a));
        col+=ribbon*mix(vec3(.1,.75,.64),vec3(.45,.25,.70),.5+.5*sin(3.*a));
        float star=fract(sin(dot(floor(d*480.),vec3(41.2,29.7,94.3)))*43758.54);
        col+=step(.9982,star)*smoothstep(.07,.5,h)*.62;
        gl_FragColor=vec4(col,1.);
      }`
  }));scene.add(mesh);
}

function landscape(scene,p){
  sky(scene);
  p("box",0x37728f,0,-1.35,0,184,.5,184);
  p("box",ice,0,-.57,-1,44,1.05,46);
  p("box",snow,0,-.045,-1,44,.12,46);
  p("box",0x85bfd5,0,.035,-1,6.9,.09,46);
  for(const z of [5.6,-9.8])p("box",0x98ccde,0,.055,z,32,.08,2.9);
  for(const x of [-3.15,3.15])p("box",gold,x,.091,-1,.062,.025,46);
  for(let i=0;i<21;i++)p("box",i%2?cedar:0x906c57,0,.05,22+i*.4,5.2,.2,.39);
  p("round",gold,0,.11,11,6.3,.08,6.3);
  p("round",navy,0,.17,11,5.95,.06,5.95);
  for(let i=0;i<8;i++)p("gem",i%2?ice:gold,Math.sin(i*Math.PI/4)*1.07,.215,11+Math.cos(i*Math.PI/4)*1.07,.66,.06,2.45,i*Math.PI/4);
  for(let i=0;i<43;i++){
    const a=i*2.39996,r=47+(i%4)*7,h=8+((i*13)%16),x=Math.cos(a)*r,z=Math.sin(a)*r;
    p("peak",i%2?0x668aaa:0x729cb8,x,h/2-2,z,19,h,17,a);
    p("peak",snow,x,h*.77-2,z,19*.46,h*.46,17*.46,a);
  }
  for(const {x,z} of TREES){
    p("round",cedar,x,.7,z,.5,1.4,.5);
    for(let j=0;j<3;j++){p("cone",0x3c777e,x,1.5+j*.81,z,2.7-j*.62,1.9,2.7-j*.62);p("cone",snow,x,1.78+j*.81,z,2.13-j*.49,1.45,2.13-j*.49);}
  }
  for(const {x,z} of LAMPS)lantern(p,x,z);
  // The castle gate sits beyond the northern walkable boundary.
  p("box",navy,0,2.2,-28,6,4.4,4);p("box",gold,0,2.1,-25.95,2.5,4.1,.12);
  for(const x of [-4,0,4]){const h=x===0?8:5.7;p("round",ice,x,h/2,-29,2.3,h,2.3);p("cone",0x87d6e8,x,h+1.6,-29,3.3,3.4,3.3);p("gem",gold,x,h+3.5,-29,.45,.85,.45);}
  // Moored expedition vessel, with lit portholes, bridge and twin funnels.
  const sx=-24,sz=25;
  p("ball",navy,sx,.15,sz,19,4.2,6);p("box",gold,sx,1.4,sz,16,.20,4.9);
  p("box",snow,sx,2.22,sz,13,1.5,4.2);p("box",navy,sx,3.46,sz,9.7,1.1,3.7);
  p("box",snow,sx,4.13,sz,10,.24,4.15);
  for(let i=-4;i<=4;i++)p("box",light,sx+i,3.53,sz-1.87,.54,.46,.08,0,0,true);
  for(const dx of [-2,1]){p("round",cedar,sx+dx,5.05,sz,1,1.7,1);p("round",gold,sx+dx,5.89,sz,1.06,.22,1.06);}
  HALLS.forEach(h=>facade(scene,p,h));
}

function interior(scene,p) {
  p("box",navy,0,-.18,0,14,.36,16);
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)p("box",(x+z)%2?0x8caebb:0xaacbd4,x*1.98,.012,z*2.18,1.95,.04,2.15);
  for(const x of [-7,7])p("box",stone,x,2.7,0,.4,5.4,16);
  p("box",stone,0,3,-8,14,6,.4);
  for(const x of [-5,0,5]){p("box",navy,x,2.85,-7.77,3.4,4.7,.08);p("gem",gold,x,3,-7.66,1.2,2.2,.12);}
  for(const x of [-6.64,6.64])for(const z of [-6,0,6]){
    p("round",gold,x,2.2,z,.50,4.4,.50);p("hip",ice,x,4.47,z,1.16,.43,1.16);
  }
  sign(scene,"Chaturanga",0,5.1,-7.68,5.6);
  for(const x of [-5,5])lantern(p,x,-7,3.5);
  const {x,z,width:w,depth:d}=TABLE;
  p("box",gold,x,.12,z,w,.24,d);p("hip",navy,x,.65,z,w*.85,.95,d*.85);
  p("box",gold,x,1.17,z,w,.18,d);p("box",cedar,x,1.29,z,3.12,.08,3.12);
  for(let i=0;i<8;i++)for(let j=0;j<8;j++){
    const px=(i-3.5)*.36,pz=z+(j-3.5)*.36;
    p("box",0xdab887,px,1.35,pz,.345,.06,.345);
    if((i===0&&j<4)||(i===7&&j>3)||(j===0&&i>3)||(j===7&&i<4))
      p("gem",i===0?red:i===7?navy:j===0?0x478771:gold,px,1.49,pz,.22,.28,.22);
  }
  p("box",navy,LECTERN.x,.66,LECTERN.z,1,1.32,1);
  p("box",gold,LECTERN.x,1.35,LECTERN.z,1.2,.14,1.1);
  sign(scene,"Heritage",LECTERN.x,1.06,LECTERN.z+.515,.97);
  sign(scene,"Harbor",0,2.45,7.7,2.55,Math.PI);
}

export function buildScenery(scene,room) {
  scene.background=new T.Color(room?0x31475b:0xb5bdcf);
  scene.fog=new T.FogExp2(room?0x31475b:0xb5c9db,room ? .022 : .015);
  const hemi=new T.HemisphereLight(0xfff4e7,0x86a7cb,1.85);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffddba,2.05);sun.position.set(-18,29,17);scene.add(sun);
  const shop=workshop(scene);
  if(room)interior(scene,shop.part);else landscape(scene,shop.part);
  shop.finish();
}
