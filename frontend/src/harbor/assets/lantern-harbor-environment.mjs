/**
 * Antarctic Kingdoms / Lantern Harbor outdoor district — DRAFT v0.1
 * Three.js 0.185.1; metres, +Y up, +Z hall entry face.
 * Original procedural geometry, no network requests, no renderer or listeners.
 */
export const shoreline = [[-22,21.0],[-19,21.7],[-16,21.3],[-13,22.1],[-9,22.0],[-5,21.8],[-3.2,22.2],[3.2,22.2],[6,22.5],[10,21.7],[15,22.1],[19,21.4],[22,21.8]];

export function buildLanternHarborEnvironment(THREE) {
  const root = new THREE.Group(); root.name = 'LanternHarborEnvironment_DRAFT';
  const groups = {};
  for (const name of ['terrain','waterfront','dock','ship','plaza','paths','lanterns','vegetation','mountains','sky','sockets']) {
    groups[name] = new THREE.Group(); groups[name].name = name; root.add(groups[name]);
  }
  let seed = 67219;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const mix = (a,b,t)=>a+(b-a)*t, TAU = Math.PI*2;
  const colors = {
    abyss:'#071b36', midnight:'#102b48', ice:'#12638b', icePale:'#70c1d7',
    iceShade:'#174e76', iceRim:'#a0dbea', snow:'#dcebf4', snowBlue:'#bdd5e5',
    stone:'#6d8eac', stoneLight:'#94b5ca', gold:'#cda65d', goldDeep:'#745d43',
    deck:'#765d53', deckLight:'#a18a72', ship:'#244d69', hullDark:'#102e4a',
    red:'#ad655a', glass:'#f8bd72', flame:'#ffe0a3', pine:'#17525b',
    pineLight:'#28727b', ridge:'#263d59', ridgeBlue:'#405b7a',
    water:'#0b426a', waterLight:'#3b8ba7', nearBlack:'#12243b'
  };
  const mat = {};
  for (const [name,color] of Object.entries(colors)) {
    const glow = name==='glass'||name==='flame';
    mat[name] = new THREE.MeshStandardMaterial({color, roughness:glow ? .38 : .79,
      metalness:(name==='gold'||name==='goldDeep') ? .55 : .03,
      emissive:glow ? new THREE.Color(color) : new THREE.Color(0),
      emissiveIntensity: name==='glass'?.47:name==='flame'?.85:0,
      flatShading:['ridge','ridgeBlue','ice','iceShade','icePale','stone'].includes(name)});
  }
  mat.waterSheen = new THREE.MeshBasicMaterial({color:'#91d3dc', transparent:true, opacity:.32, depthWrite:false, side:THREE.DoubleSide});
  mat.lightPool = new THREE.MeshBasicMaterial({color:'#ffc177', transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide});
  function curtain(tint) {
    return new THREE.ShaderMaterial({
      uniforms:{tint:{value:new THREE.Color(tint)}},
      transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
      vertexShader:`varying vec2 st; void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform vec3 tint; varying vec2 st;
        void main(){
          float folds=.55+.23*sin(st.x*88.+sin(st.x*22.)*3.)+.13*sin(st.x*267.+st.y*1.7);
          float foot=.18+.065*sin(st.x*19.);
          float band=exp(-abs(st.y-foot)*6.)*smoothstep(0.,foot,st.y);
          float veil=band*folds*smoothstep(0.,.14,st.x)*(1.-smoothstep(.86,1.,st.x));
          gl_FragColor=vec4(mix(tint,vec3(.37,.25,.88),st.y*.7),veil*.83);
          #include <colorspace_fragment>
        }`
    });
  }
  mat.auroraA=curtain('#51ecb8');mat.auroraB=curtain('#78beff');
  const UNIT = new THREE.BoxGeometry(1,1,1);
  const cylind = new Map();
  const cylinder = (n=8) => { if (!cylind.has(n)) cylind.set(n,new THREE.CylinderGeometry(.5,.5,1,n)); return cylind.get(n); };
  const cone = (n=8) => new THREE.ConeGeometry(1,1,n);
  // Every material in each named group becomes ONE mesh / draw call.
  // The batches intentionally merge geometry only within a semantic group.
  class Batch {
    constructor(group) {this.group=group; this.entries=new Map();}
    add(geometry, key, p=[0,0,0], r=[0,0,0], s=[1,1,1]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...p),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
      const g = geometry.clone(); g.applyMatrix4(m);
      const a = this.entries.get(key)||[]; a.push(g); this.entries.set(key,a);
    }
    box(key,x,y,z,w,h,d,ry=0) { this.add(UNIT,key,[x,y,z],[0,ry,0],[w,h,d]); }
    col(key,x,y,z,rBot,rTop,h,n=8) {
      const k = `${n}|${rTop}|${rBot}|${h}`;
      if (!tubeCache.has(k)) tubeCache.set(k,new THREE.CylinderGeometry(rTop,rBot,h,n));
      this.add(tubeCache.get(k),key,[x,y,z]);
    }
    orb(key,x,y,z,r,detail=0) { const k=`${detail}`; if(!orbCache.has(k))orbCache.set(k,new THREE.IcosahedronGeometry(1,detail)); this.add(orbCache.get(k),key,[x,y,z],[0,0,0],[r,r,r]); }
    // Extruded closed XZ polygon (with flat-shaded separate-face vertices).
    poly(key,pts,yTop,yBottom) { this.add(prism(pts,yTop,yBottom),key); }
    tube(key,points,radius=.04,n=4) {
      const curve = new THREE.CatmullRomCurve3(points.map(q=>new THREE.Vector3(...q)));
      this.add(new THREE.TubeGeometry(curve,Math.max(5,points.length*4),radius,n,false),key);
    }
    finish(){
      for(const [key,parts] of this.entries){
        let vertices=0, indices=0;
        for(const g of parts){vertices+=g.getAttribute('position').count;indices+=g.index?g.index.count:g.getAttribute('position').count;}
        const pos=new Float32Array(vertices*3), nor=new Float32Array(vertices*3), idx=new (vertices>65535?Uint32Array:Uint16Array)(indices);
        let v=0,i=0;
        for(const g of parts){
          const p=g.getAttribute('position'),n=g.getAttribute('normal');
          pos.set(p.array,v*3); if(n)nor.set(n.array,v*3);
          if(g.index){let a=g.index.array;for(let j=0;j<a.length;j++)idx[i++]=a[j]+v;}
          else for(let j=0;j<p.count;j++)idx[i++]=v+j;
          v+=p.count;g.dispose();
        }
        const merged=new THREE.BufferGeometry();
        merged.setAttribute('position',new THREE.BufferAttribute(pos,3));
        merged.setAttribute('normal',new THREE.BufferAttribute(nor,3));
        merged.setIndex(new THREE.BufferAttribute(idx,1));
        merged.computeBoundingSphere();
        const mesh=new THREE.Mesh(merged,mat[key]);mesh.name=`${this.group.name}_${key}`;
        mesh.castShadow=false;mesh.receiveShadow=false;this.group.add(mesh);
      }
      this.entries.clear();
    }
  }
  const tubeCache=new Map(),orbCache=new Map();
  function prism(points,top,bottom){
    let a=0;for(let i=0;i<points.length;i++){let p=points[i],q=points[(i+1)%points.length];a+=p[0]*q[1]-q[0]*p[1];}
    let pts=a>0?[...points]:[...points].reverse(); // positive signed XZ area
    const shape=pts.map(p=>new THREE.Vector2(p[0],p[1]));
    const tris=THREE.ShapeUtils.triangulateShape(shape,[]);
    let xyz=[]; const tri=(a,b,c)=>xyz.push(...a,...b,...c);
    for(let t of tris){ // CCW in XZ points down; reverse for +Y facing
      const p=pts[t[0]],q=pts[t[1]],r=pts[t[2]];
      tri([p[0],top,p[1]],[r[0],top,r[1]],[q[0],top,q[1]]);
      tri([p[0],bottom,p[1]],[q[0],bottom,q[1]],[r[0],bottom,r[1]]);
    }
    for(let i=0;i<pts.length;i++){
      const p=pts[i],q=pts[(i+1)%pts.length];
      const a=[p[0],top,p[1]],b=[q[0],top,q[1]],c=[q[0],bottom,q[1]],d=[p[0],bottom,p[1]];
      tri(a,b,c);tri(a,c,d);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));g.computeVertexNormals();return g;
  }
  const disk=(n=48,r=1)=>new THREE.CylinderGeometry(r,r,1,n);
  function torus(batch,key,x,y,z,r,tubeR=.018,arc=TAU,start=0){batch.add(new THREE.TorusGeometry(r,tubeR,3,Math.max(14,Math.round(arc/TAU*80)),arc),key,[x,y,z],[Math.PI/2,0,start]);}
  function seg(batch,key,a,b,thick=.03,n=5){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b), delta=B.clone().sub(A),mid=A.clone().add(B).multiplyScalar(.5);
    let g=new THREE.CylinderGeometry(thick,thick,delta.length(),n);
    const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    const m=new THREE.Matrix4().compose(mid,quaternion,new THREE.Vector3(1,1,1));g.applyMatrix4(m);batch.add(g,key);
  }
  function ribbon(batch,key,a,b,width,y=.055){
    let dx=b[0]-a[0],dz=b[1]-a[1],dist=Math.hypot(dx,dz),nx=-dz/dist*width/2,nz=dx/dist*width/2;
    batch.poly(key,[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],y,y-.035);
  }
  // ---- Land: irregular, layered shoreline with two visible strata ----
  const terrain=new Batch(groups.terrain),waterfront=new Batch(groups.waterfront);
  const south = shoreline;
  const shorePoly=[[-22,-24],[22,-24],...south.slice().reverse()];
  terrain.poly('ice',shorePoly,-.08,-1.0);
  terrain.poly('iceShade',shorePoly,-1.0,-2.12);
  const shoreIn=south.map(([x,z],i)=>[x+.15*Math.sin(i*1.4),z-.43]);
  terrain.poly('snowBlue',[[-21.7,-23.7],[21.7,-23.7],...shoreIn.slice().reverse()],-.028,-.10);
  // Natural frost crust around edge, broken into sections; central boarding clear.
  for(let i=0;i<south.length-1;i++){
    let a=south[i],b=south[i+1];if(Math.max(Math.abs(a[0]),Math.abs(b[0]))<3.4)continue;
    const z=(a[1]+b[1])/2;
    waterfront.poly('snow',[[a[0],a[1]-.27],[b[0],b[1]-.27],[b[0],b[1]+.12],[a[0],a[1]+.12]],.075,-.08);
    for(let t=0;t<3;t++){
      const xx=mix(a[0],b[0],(t+.5)/3);const rad=.20+rand()*.45;
      waterfront.add(new THREE.IcosahedronGeometry(1,0),i%2?'icePale':'ice',[xx,-1.18,z+.2+rand()*.7],[rand()*.2,rand()*TAU,rand()*.12],[rad,.15+rand()*.2,rad*1.2]);
    }
  }
  // Offshore water — faceted shallow bands with few controlled highlights.
  waterfront.box('water',0,-2.30,38.0,160,.12,63);
  for(let i=0;i<19;i++){
    const x=-45+i*4.9,z=28+rand()*30;
    ribbon(waterfront,'waterLight',[x,z],[x+1.8+rand()*3,z-.14-rand()*.35],.055+rand()*.04,-2.216);
  }
  for(let i=0;i<15;i++){
    const x=-26+rand()*65,z=24+rand()*30;
    ribbon(waterfront,'waterSheen',[x,z],[x+1+rand()*3,z+.04],.025,-2.203);
  }
  terrain.finish(); waterfront.finish();
  // ---- Socket ground only: NO halls or structural guide geometry ----
  const sockets = [
    ['templeSocket',-14,0,9,8],['pavilionSocket',-7.7,-15,8.6,7],
    ['palaceSocket',7.7,-15,8.6,7],['councilSocket',14,0,9,8]
  ];
  const sc=new Batch(groups.sockets);
  for(const [name,x,z,w,d] of sockets){
    sc.box('stoneLight',x,-.005,z,w,.025,d);
    // Light flush joint at edges; reserved construction pad stays unoccupied.
    const p=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
    for(let i=0;i<4;i++) ribbon(sc,'goldDeep',p[i],p[(i+1)%4],.025,.025);
  }
  sc.finish();
  // ---- Circulation / paving; plaza centered (0,5.1) ----
  const paths=new Batch(groups.paths), plaza=new Batch(groups.plaza);
  function path(a,b,width=2.35){
    ribbon(paths,'stone',a,b,width,.035);
    const dx=b[0]-a[0],dz=b[1]-a[1],dist=Math.hypot(dx,dz),ux=dx/dist,uz=dz/dist;
    const px=-uz,pz=ux,N=Math.max(1,Math.floor(dist/.85));
    for(let i=0;i<N;i++){
      const t=(i+.5)/N,xc=mix(a[0],b[0],t),zc=mix(a[1],b[1],t),c=width*(.85+rand()*.06);
      const y=.043+rand()*.009, rot=Math.atan2(ux,uz);
      paths.box(i%4===0?'stoneLight':'stoneLight',xc,y,zc,c,.018,dist/N*.86,rot);
      if(i%3===0)paths.box('goldDeep',xc,y+.013,zc,c*.78,.009,.025,rot);
    }
    ribbon(paths,'gold',[a[0]+px*(width/2-.12),a[1]+pz*(width/2-.12)],[b[0]+px*(width/2-.12),b[1]+pz*(width/2-.12)],.036,.056);
    ribbon(paths,'gold',[a[0]-px*(width/2-.12),a[1]-pz*(width/2-.12)],[b[0]-px*(width/2-.12),b[1]-pz*(width/2-.12)],.036,.056);
  }
  path([0,21.6],[0,11.4],3.0);
  path([-6.45,5.1],[-14,4.45],2.35);
  path([6.45,5.1],[14,4.45],2.35);
  path([-2.7,-.65],[-7.7,-10.9],2.2);
  path([2.7,-.65],[7.7,-10.9],2.2);
  path([-2.5,-1.35],[2.5,-1.35],2.2);
  // north look-out from plaza, splitting two northern hall approaches
  path([0,-1.5],[0,-8.7],2.0);
  paths.finish();
  const plazaZ=5.1;
  plaza.add(new THREE.CylinderGeometry(7.30,7.52,.24,64), 'iceShade',[0,-.115,plazaZ]);
  plaza.add(new THREE.CylinderGeometry(7.17,7.28,.09,64), 'stone',[0,-.004,plazaZ]);
  for(let ring=0;ring<3;ring++){
    const ri=[1.15,3.0,5.06][ring],ro=[2.87,4.88,6.9][ring],N=[16,24,32][ring];
    for(let i=0;i<N;i++){
      const a=TAU*(i+.02)/N,b=TAU*(i+.98)/N;
      let pts=[];for(let q=0;q<=3;q++){let t=mix(a,b,q/3);pts.push([Math.cos(t)*ri,plazaZ+Math.sin(t)*ri]);}
      for(let q=3;q>=0;q--){let t=mix(a,b,q/3);pts.push([Math.cos(t)*ro,plazaZ+Math.sin(t)*ro]);}
      plaza.poly((ring+i)%7===0?'stoneLight':'stoneLight',pts,.061,.028);
    }
  }
  for(const r of [1.06,2.94,4.96,7.02])torus(plaza,'gold',0,.073,plazaZ,r,.026);
  // Inlaid 16-point compass rose laid flush, nothing raised to catch feet.
  plaza.add(new THREE.CylinderGeometry(.95,.95,.064,32),'midnight',[0,.049,plazaZ]);
  for(let i=0;i<16;i++){
    const a=TAU*i/16;const L=(i%4===0)?2.28:(i%2===0?1.6:1.1),w=i%4===0?.24:.10;
    const v=(r,da)=>[Math.sin(a+da)*r,plazaZ+Math.cos(a+da)*r];
    plaza.poly(i%2?'iceRim':'gold',[v(.10,-w),v(L,0),v(.10,w)],.082,.073);
  }
  plaza.add(new THREE.CylinderGeometry(.22,.22,.032,16),'gold',[0,.09,plazaZ]);
  for(let a=0;a<4;a++){
    let t=TAU*a/4,dx=Math.sin(t),dz=Math.cos(t);
    plaza.box('gold',dx*5.91,.094,plazaZ+dz*5.91,.37,.013,.065,t);
  }
  plaza.finish();
  // ---- Harbor lighting: metalwork, panes, finials, light-pools ----
  const lights=new Batch(groups.lanterns);
  const lightPositions=[[-2.25,18],[2.25,18],[-5.9,11],[5.9,11],[-10.3,7.4],[10.3,7.4],
    [-17,6.65],[17,6.65],[-5.2,-6.2],[5.2,-6.2],[-10,-9.3],[10,-9.3],[-2.2,-9.6],[2.2,-9.6],[-3.55,23.3],[3.55,23.3]];
  function lamp(x,z,scale=1){
    const h=2.9*scale;
    lights.add(new THREE.CylinderGeometry(.19,.24,.30,8),'goldDeep',[x,.15,z]);
    lights.col('goldDeep',x,1.16*scale,z,.09,.055,2.24*scale,8);
    lights.col('gold',x,.88*scale,z,.125,.125,.055,8);
    for(const dy of [1.65,2.2])lights.add(new THREE.CylinderGeometry(.22,.17,.12,8),'gold',[x,dy*scale,z]);
    lights.col('glass',x,2.00*scale,z,.155,.188,.52*scale,6);
    for(let j=0;j<6;j++){
      let a=TAU*j/6;const qx=Math.cos(a)*.18,qz=Math.sin(a)*.18;
      lights.box('goldDeep',x+qx,2*scale,z+qz,.027,.59*scale,.028,-a);
    }
    lights.add(new THREE.ConeGeometry(.23,.25*scale,6),'gold',[x,2.36*scale,z]);
    lights.orb('glass',x,2.50*scale,z,.06);
    lights.add(new THREE.ConeGeometry(.23,.13*scale,7),'snow',[x,2.51*scale,z]);
    lights.add(new THREE.CylinderGeometry(.72,.72,.001,20),'lightPool',[x,.084,z]);
  }
  lightPositions.forEach(p=>lamp(...p));
  lights.finish();
  // ---- Vegetation, benches, ice crystal clusters and seawall details ----
  const veg=new Batch(groups.vegetation);
  const obstacles=[]; const boundaries=[];
  const collide=(name,x,y,z,sx,sy,sz)=>obstacles.push({name,center:[x,y,z],size:[sx,sy,sz]});
  const boundary=(name,x,y,z,sx,sy,sz)=>boundaries.push({name,center:[x,y,z],size:[sx,sy,sz]});
  function tree(x,z,h,variation=0){
    veg.col('deck',x,h*.19,z,.12,.07,h*.38,7);
    for(let layer=0;layer<4;layer++){
      const H=h*(.22+layer*.20),w=h*(.38-layer*.077),y=h*(.31+layer*.175);
      const pts=[];let sides=7;
      for(let i=0;i<sides;i++){let a=TAU*i/sides+variation;pts.push([x+Math.cos(a)*w*(i%2?.81:1),z+Math.sin(a)*w*(i%2?.81:1)]);}
      // A dense ring of actual faceted branch volumes, not a flat sprite.
      const top=[x,y+H*.45,z];
      for(let i=0;i<sides;i++){
        const a=pts[i],b=pts[(i+1)%sides];
        const g=new THREE.BufferGeometry();
        const vertices=[...top,a[0],y-H*.36,a[1],b[0],y-H*.36,b[1],
          x,y-H*.32,z,b[0],y-H*.36,b[1],a[0],y-H*.36,a[1]];
        g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
        veg.add(g,layer%2?'pine':'pine');
      }
      // Light snow on sloping crown tips rather than the whole tree.
      if(layer>0){veg.add(new THREE.ConeGeometry(w*.37,H*.33,7), 'snow',[x,y+H*.38,z]);}
    }
    veg.add(new THREE.ConeGeometry(h*.12,h*.33,7),'snow',[x,h*.92,z]);
    collide(`evergreen_${x}_${z}`,x,h*.30,z,.55,h*.65,.55);
  }
  const treeSpots=[[-20.6,-20],[-18.8,-13],[-21,-6.5],[-20.3,4],[-21.0,12],[-19,18],
    [20.5,-20],[18.9,-13],[20.8,-6.6],[20.7,4.5],[21,12],[19.1,18],
    [-16.8,-21.5],[-13.5,-21.4],[-3,-22],[3,-22],[13.6,-21.4],[16.9,-21.5],
    [-11,16.3],[-15.5,17], [11,16.2],[15.4,17.4]];
  treeSpots.forEach(([x,z],i)=>tree(x,z,3.1+rand()*2.2,rand()*TAU));
  function crystal(x,z,s=1){
    for(let i=0;i<3;i++){
      const angle=rand()*TAU,r=.13+i*.16, h=(.65+rand()*1.1)*s;
      veg.add(new THREE.ConeGeometry((.24+rand()*.16)*s,h,5),'icePale',
        [x+Math.sin(angle)*r,h*.48,z+Math.cos(angle)*r],[.08,rand()*TAU,.11]);
    }
    veg.box('snow',x,.06,z,1.1*s,.12,.85*s);
    collide(`crystal_${x}_${z}`,x,.5,z,.9,1.1,.8);
  }
  [[-18.5,10.5],[18.7,10.8],[-19.8,-3.5],[19.6,-3.6],[-15.9,-8.1],[15.9,-8.1],[-6,18],[6,18]].forEach(q=>crystal(...q,.7+rand()*.5));
  function bench(x,z,yaw=0){
    const c=Math.cos(yaw),s=Math.sin(yaw),T=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
    const [px,pz]=T(0,0);
    veg.box('deck',px,.50,pz,1.65,.12,.51,yaw);
    const [bx,bz]=T(0,-.26); veg.box('deck',bx,.94,bz,1.63,.66,.12,yaw);
    for(let d of [-.65,.65]){
      const [xx,zz]=T(d,0);veg.box('goldDeep',xx,.27,zz,.12,.52,.45,yaw);
      const [rx,rz]=T(d,-.36);veg.box('goldDeep',rx,.91,rz,.09,.18,.09,yaw);
    }
    collide(`bench_${x}_${z}`,x,.52,z,1.7,.95,.78);
  }
  [[-8,13,0],[8,13,0],[-17.8,11,Math.PI/2],[17.8,11,-Math.PI/2],[-13,-8,Math.PI/2],[13,-8,-Math.PI/2]].forEach(a=>bench(...a));
  // Perimeter low stone retaining walls with cap-snow, only where not doorways.
  for(const side of [-1,1]){
    for(let j=0;j<7;j++){
      let z=-22+j*6.1;
      if(z>-5&&z<7)continue;
      const x=side*21.85;
      veg.box('iceShade',x,.43,z,.38,.85,4.8);
      veg.box('snow',x,.88,z,.63,.18,5.1);
      for(let k=0;k<4;k++)veg.box('iceShade',x+side*.06,.52,z-1.8+k*1.2,.05,.48,.045);
      boundary(`edge_${side}_${j}`,side*22.65,.45,z,.65,1.2,5.5);
    }
  }
  veg.finish();
  lightPositions.forEach(([x,z],i)=>collide(`lantern_${i}`,x,1.2,z,.40,2.5,.40));
  // ---- Dock proper: open piles, visible plank ends, ribs, bollards, draped ropes ----
  const dock=new Batch(groups.dock);
  dock.box('hullDark',0,-.28,27.2,5.6,.33,11.9);
  dock.box('deck',0,.01,27.2,5.9,.15,11.9);
  for(let j=0;j<30;j++){
    const z=21.35+j*.397;
    dock.box(j%7?'deck':'deck',0,.10,z,5.77,.075,.30);
    if(j%4===0){dock.box('goldDeep',-2.81,.145,z,.05,.015,.13);dock.box('goldDeep',2.81,.145,z,.05,.015,.13);}
  }
  for(let i=0;i<5;i++){
    let z=22.2+i*2.52;
    for(let x of [-2.5,2.5]){
      dock.col('deck',x,-1.23,z,.25,.23,3.05,9);
      dock.col('goldDeep',x,.22,z,.34,.34,.13,9);
      dock.col('snow',x,.295,z,.26,.24,.08,9);
    }
    dock.box('goldDeep',0,-.15,z,5.75,.12,.13);
  }
  // Mooring bollards, ring-eye details and heavy rope sag.
  for(const z of [23.7,29.7,32.7]){
    for(const x of [-2.4,2.4]){
      dock.col('goldDeep',x,.45,z,.135,.135,.58,9);
      dock.col('goldDeep',x,.77,z,.24,.24,.11,9);
      dock.box('goldDeep',x,.76,z,.58,.10,.19);
    }
  }
  for(const s of [-1,1]){
    for(let z=23.7;z<31;z+=3){
      dock.tube('deck',[[s*2.4,.7,z],[s*2.63,.28,z+.82],[s*2.4,.7,z+3]],.043,5);
    }
  }
  dock.finish();
  boundary('south_coast_west',-13,.6,23.25,19,1.4,1.9);
  boundary('south_coast_east',13,.6,23.25,19,1.4,1.9);
  // ---- Expedition vessel: independent shaped hull, open deck, bridge, bow, funnels ----
  const ship=new Batch(groups.ship);
  const shipX=9.2, shipZ=37.4;
  function xy(x,z){return [shipX+x,shipZ+z];}
  // Hull oriented along X. Multiple different-width sections shape the bow and stern.
  const stations=[[-8.85,.20,-1.65],[-8.2,1.70,-1.60],[-6.7,2.40,-1.43],[-3.5,2.80,-1.18],[1.5,2.95,-1.07],[5.4,2.50,-.78],[7.5,1.55,-.30],[8.85,.10,.50]];
  const hullVerts=[]; const pushTri=(a,b,c)=>hullVerts.push(...a,...b,...c);
  for(let i=0;i<stations.length-1;i++){
    let [ax,aw,ah]=stations[i],[bx,bw,bh]=stations[i+1];
    const topA=.15+(ax>5?(ax-5)*.26:0),topB=.15+(bx>5?(bx-5)*.26:0);
    for(const side of [-1,1]){
      // Flared hull at gunwale, narrowing below water line.
      const A=[shipX+ax,topA,shipZ+side*aw],B=[shipX+bx,topB,shipZ+side*bw],
        C=[shipX+bx,-1.68+bh*.28,shipZ+side*bw*.75],D=[shipX+ax,-1.68+ah*.28,shipZ+side*aw*.75],
        E=[shipX+ax,-2.28,shipZ+side*aw*.48],F=[shipX+bx,-2.28,shipZ+side*bw*.48];
      pushTri(A,B,C);pushTri(A,C,D);pushTri(D,C,F);pushTri(D,F,E);
    }
  }
  const hullG=new THREE.BufferGeometry();hullG.setAttribute('position',new THREE.Float32BufferAttribute(hullVerts,3));hullG.computeVertexNormals();
  mat.hullDark.side=THREE.DoubleSide;ship.add(hullG,'hullDark');
  // Tapered top deck: actual polygon; rim edge/rail follows gunwale profile.
  const port=stations.map(([x,w])=>[shipX+x,shipZ-w*.89]);
  const star=stations.slice().reverse().map(([x,w])=>[shipX+x,shipZ+w*.89]);
  ship.poly('deck',[...port,...star],.25,.06);
  for(const side of [-1,1]){
    const pts=stations.map(([x,w])=>[shipX+x,.22+(x>5?(x-5)*.26:0),shipZ+side*w]);
    ship.tube('goldDeep',pts,.065,6);
    for(let i=1;i<stations.length-1;i++){
      const [x,w]=stations[i],y=.28+(x>5?(x-5)*.26:0);
      const xp=shipX+x,zp=shipZ+side*w;
      ship.col('goldDeep',xp,y+.35,zp,.032,.032,.65,5);
    }
    ship.tube('deck',stations.slice(1,-1).map(([x,w])=>[shipX+x,.93+(x>5?(x-5)*.26:0),shipZ+side*w]),.028,5);
  }
  ship.box('ship',shipX-2.65,.83,shipZ,5.9,1.2,3.5);
  ship.box('snow',shipX-2.65,1.47,shipZ,6.0,.12,3.62);
  ship.box('ship',shipX-.65,1.73,shipZ,3.35,1.45,3.12);
  ship.box('goldDeep',shipX-.65,2.48,shipZ,3.62,.16,3.46);
  ship.box('snow',shipX-.65,2.58,shipZ,3.78,.15,3.62);
  // Deep amber bridge panes set inside brass window divisions.
  for(let i=0;i<5;i++){
    let x=shipX-1.91+i*.63;
    ship.box('glass',x,2.02,shipZ+1.60,.49,.72,.065);
    ship.box('glass',x,2.02,shipZ-1.60,.49,.72,.065);
    ship.box('gold',x,1.64,shipZ+1.64,.51,.045,.08);
    ship.box('gold',x,1.64,shipZ-1.64,.51,.045,.08);
  }
  for(let side of [-1,1])for(let i=0;i<3;i++){
    ship.box('glass',shipX-4.8+i*1.95,.83,shipZ+side*1.82,.82,.39,.04);
  }
  for(let x of [shipX-4.15,shipX-2.7]){
    ship.col('goldDeep',x,2.74,shipZ,.43,.43,1.25,9);
    ship.col('red',x,3.2,shipZ,.45,.45,.18,9);
    ship.col('snow',x,3.34,shipZ,.46,.44,.10,9);
  }
  // Bow elevated and pointy; roofed ice-breaker; strong side ribs.
  ship.poly('ship',[[shipX+4.6,shipZ-2.14],[shipX+7.55,shipZ-1.3],[shipX+8.72,shipZ],[shipX+7.55,shipZ+1.3],[shipX+4.6,shipZ+2.14]],.59,.28);
  for(let side of [-1,1])ship.tube('gold',[ [shipX+4.6,.57,shipZ+side*2.1],[shipX+6.4,.74,shipZ+side*1.68],[shipX+8.72,1.12,shipZ] ],.07,6);
  ship.col('gold',shipX+7.1,1.31,shipZ,.065,.065,1.0,7);
  // Expedition mast and signal pennant plus geometric AGC monogram on cabin broadside.
  ship.col('deck',shipX+3.1,2.14,shipZ,.10,.065,3.6,9);
  ship.tube('gold',[[shipX+3.1,3.92,shipZ],[shipX+5.1,.95,shipZ+1.55]],.021,4);
  ship.poly('red',[[shipX+3.15,shipZ],[shipX+5.4,shipZ+.04],[shipX+3.15,shipZ+.11]],4.0,3.2);
  // 'AGC' portside marking uses physical letter strokes (no fonts or textures).
  function letterStroke(letter,cx,z,scale=.56){
    const strokes={
      A:[[[0,0],[.35,.92]],[[.35,.92],[.7,0]],[[.15,.38],[.55,.38]]],
      G:[[[.7,.76],[.45,.95]],[[.45,.95],[.10,.76]],[[.10,.76],[0,.45]],[[0,.45],[.16,.10]],[[.16,.10],[.60,.08]],[[.60,.08],[.7,.48]],[[.7,.48],[.44,.48]]],
      C:[[[.7,.79],[.43,.95]],[[.43,.95],[.09,.79]],[[.09,.79],[0,.46]],[[0,.46],[.15,.11]],[[.15,.11],[.46,.07]],[[.46,.07],[.70,.20]]]
    };
    for(let [a,b] of strokes[letter])seg(ship,'gold', [cx+a[0]*scale,.60+a[1]*scale,z],[cx+b[0]*scale,.60+b[1]*scale,z],.027,5);
  }
  'AGC'.split('').forEach((c,i)=>letterStroke(c,shipX-4.7+i*.54,shipZ-1.875));
  // Gangway between dock tip and ship's port stern (not a floating obstacle).
  const rampA=[2.7,31.8],rampB=[4.0,shipZ-2.65];
  const dx=rampB[0]-rampA[0],dz=rampB[1]-rampA[1],L=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
  ship.box('deck',mix(rampA[0],rampB[0],.5),.35,mix(rampA[1],rampB[1],.5),1.25,.13,L,yaw);
  for(let k of [-.5,.5]){
    const tx=-dz/L*k,tz=dx/L*k;
    ship.tube('goldDeep',[[rampA[0]+tx,.65,rampA[1]+tz],[rampB[0]+tx,.73,rampB[1]+tz]],.055,5);
  }
  ship.finish();
  collide('ship_hull',shipX,-.8,shipZ,17.2,3.3,5.9);
  boundary('dock_west_edge',-3.55,.5,29.0,.65,1.2,7.5);
  boundary('dock_east_edge',3.55,.5,27.0,.65,1.2,5.5);
  // ---- Distant continuous alpine ridges, selective snowfields; castle silhouette ----
  const mountains=new Batch(groups.mountains);
  // Shared vertices on a sloping alpine grid give each snow crest a continuous
  // front face, foothills and a far slope as the camera turns along the quay.
  function range(centerZ, height, phase, near) {
    const rows = [], triangles = {ridge:[], ridgeBlue:[], snowBlue:[], snow:[]};
    const bands = [-1,-.66,-.32,0,.26,.54,.79,1];
    for (let i=0;i<=68;i++) {
      const x=(i-34)*3.5;
      const crest=.26+.33*Math.abs(Math.sin(x*.079+phase))+
        .27*Math.abs(Math.sin(x*.133+phase*.7))+.12*Math.cos(x*.24+phase);
      const valley=near ? .3+.7*Math.min(1,Math.abs(x)/25) : 1;
      rows.push(bands.map((u,j)=>{
        const flank=Math.max(0,1-Math.abs(u));
        return [x+Math.sin(i*4.3+j*2.7)*.85,
          -2 + height*valley*crest*flank + Math.sin(i*1.6+j*.76)*flank*1.3,
          centerZ+u*13+Math.sin(i*.83+phase)*2+Math.cos(i*.25)*2.8];
      }));
    }
    const normal=new THREE.Vector3(), ab=new THREE.Vector3(), ac=new THREE.Vector3();
    function face(a,b,c) {
      ab.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);ac.set(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
      normal.crossVectors(ab,ac).normalize();
      const snow=normal.y>.56+.11*Math.sin((a[0]+c[2])*.65) && (a[1]+b[1]+c[1])/3>height*.21;
      const key=snow ? (normal.x<.14?'snow':'snowBlue') : (normal.x>.08?'ridge':'ridgeBlue');
      triangles[key].push(...a,...b,...c);
    }
    for(let i=0;i<rows.length-1;i++)for(let j=0;j<bands.length-1;j++){
      const a=rows[i][j],b=rows[i+1][j],c=rows[i][j+1],d=rows[i+1][j+1];
      if((i+j)%2){face(a,c,b);face(b,c,d);}else{face(a,d,b);face(a,c,d);}
    }
    for(const [material,positions] of Object.entries(triangles)){
      if(!positions.length)continue;
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.computeVertexNormals();mountains.add(g,material);g.dispose();
    }
  }
  range(-88,34,.9,false);range(-63,26,2.8,false);range(-43,14,4.6,true);

  // The gateway sits on rock in a gap between the near ridges. Its roof and
  // lanterns stay recognizable at the small screen size of the arrival view.
  const cz=-49;
  mountains.add(new THREE.IcosahedronGeometry(1,1),'ridgeBlue',[0,.1,cz],[0,.25,0],[12,3.3,5.5]);
  mountains.box('iceShade',0,5.2,cz,13,6.8,4);
  mountains.box('iceRim',0,8.65,cz,13.5,.36,4.35);
  mountains.box('goldDeep',0,4.9,cz+2.07,3.3,5.1,.2);
  mountains.box('glass',0,4.6,cz+2.2,2.7,4.6,.1);
  function turret(x,z,height,radius){
    mountains.col('iceShade',x,height/2+1,z,radius,radius*.94,height,8);
    for(const y of [height*.36,height*.68,height+.86])
      mountains.col('iceRim',x,y,z,radius*1.08,radius*1.1,.26,8);
    const roof=radius*2.6, base=height+1;
    mountains.add(new THREE.ConeGeometry(radius*1.24,roof,8),'ice',[x,base+roof*.5,z]);
    mountains.add(new THREE.ConeGeometry(radius*.30,roof*.24,8),'snow',[x,base+roof*.88,z]);
    mountains.col('gold',x,base+roof+.35,z,.07,.05,.7,6);
    mountains.orb('flame',x,base+roof+.75,z,.16);
    for(const y of [height*.54,height*.83])for(const dx of [-.36,.36])
      mountains.box('glass',x+dx*radius,y,z+radius*.94,.16*radius,height*.115,.12);
  }
  turret(-6.5,cz+.6,8.1,1.5);turret(6.5,cz+.6,8.1,1.5);
  turret(-3.6,cz-1.9,10.2,1.6);turret(3.6,cz-1.9,10.2,1.6);turret(0,cz-.5,12.4,2.0);
  mountains.finish();
  // ---- Aurora curtains: update() is opt-in, no internal timing or event loop ----
  const skyMeshes=[];
  for(let band=0;band<3;band++){
    let verts=[],uv=[];const N=48,low=18+band*3.2,high=34+band*6.1,z=-82-band*3;
    for(let j=0;j<N;j++){
      const t=j/(N-1),x=-61+t*122,und=Math.sin(t*18+band)*1.8;
      verts.push(x,low+und,z+Math.sin(t*8+band)*6);
      verts.push(x,high+und+Math.sin(t*21+band)*3,z+Math.sin(t*8+band)*6-3.2);
      uv.push(t,0,t,1);
    }
    const indexes=[];for(let j=0;j<N-1;j++){
      const a=j*2;indexes.push(a,a+1,a+2,a+1,a+3,a+2);
    }
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geom.setIndex(indexes);geom.computeVertexNormals();
    const mesh=new THREE.Mesh(geom,mat[band===1?'auroraB':'auroraA']);mesh.name=`aurora_curtain_${band}`;
    mesh.frustumCulled=false;groups.sky.add(mesh);skyMeshes.push({mesh,base:new Float32Array(verts),band});
  }
  let elapsed=0,reduceMotion=true;
  root.userData.setReducedMotion = enabled => {reduceMotion=Boolean(enabled);if(reduceMotion){for(const v of skyMeshes){v.mesh.geometry.attributes.position.array.set(v.base);v.mesh.geometry.attributes.position.needsUpdate=true;}}};
  root.userData.update = dt => {
    if(reduceMotion)return;
    elapsed+=Math.min(.05,Math.max(0,dt));
    for(const v of skyMeshes){const p=v.mesh.geometry.attributes.position;
      for(let j=0;j<p.count;j++){p.array[j*3+1]=v.base[j*3+1]+Math.sin(elapsed*.28+j*.17+v.band)*.65;
        p.array[j*3+2]=v.base[j*3+2]+Math.sin(elapsed*.22+j*.10+v.band)*.36;}
      p.needsUpdate=true;
    }
  };
  // ---- Exact host coordinate frame, yaw zero on all hall sockets ----
  const anchors={};
  function anchor(name,x,y,z,rotationY=0){
    const a=new THREE.Object3D();a.name=name;a.position.set(x,y,z);a.rotation.y=rotationY;
    root.add(a);anchors[name]=a;
  }
  anchor('spawn',0,0,21);anchor('templeSocket',-14,0,0);
  anchor('pavilionSocket',-7.7,0,-15);anchor('palaceSocket',7.7,0,-15);
  anchor('councilSocket',14,0,0);anchor('castleVista',0,0,-50);
  anchor('shipMooring',2.4,0,32.7);
  // Crossing beyond these boxes is disallowed by the host. They are NOT visual meshes.
  boundary('north_edge',0,.65,-24.9,46,1.6,.9);
  boundary('west_edge',-22.9,.65,-1.2,.9,1.6,47.0);
  boundary('east_edge',22.9,.65,-1.2,.9,1.6,47.0);
  boundary('south_dock_end',0,.4,33.5,5.9,.9,.5);
  const colliders={boundaries,obstacles};
  root.userData.assetStatus='DRAFT';
  root.userData.units='metres';
  root.userData.coordinateSystem='+Y up, hall entrances +Z';
  root.userData.groundGroups=Object.keys(groups);
  root.userData.sockets=sockets.map(([name,x,z,width,depth])=>({name,center:[x,0,z],size:[width,0,depth],entrance:[x,0,z+depth/2]}));
  root.userData.physics='AABB lists in colliders.boundaries and colliders.obstacles';
  root.userData.materialSources='original procedural materials, no textures';
  return {root,colliders,anchors};
}
