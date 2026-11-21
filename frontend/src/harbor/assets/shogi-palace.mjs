/**
 * SHOGI PALACE — DRAFT / Antarctic Kingdoms at Lantern Harbor
 * Three.js r0.185.1 | one standalone navigable exterior asset
 * Units: metres; +Y up; main entrance +Z; origin centred in 8.6 m x 7.0 m footprint.
 *
 * No renderer, camera, runtime listeners, network fetches, or external textures.
 * Materials and geometry are original procedural work. All fixed geometry is
 * baked into material-specific meshes so the standard view uses few draw calls.
 *
 * @param {typeof import('three')} THREE Existing host Three.js namespace
 * @returns {{ root: THREE.Group, colliders: Array<{name:string,center:number[],size:number[]}>, anchors: Object<string,THREE.Object3D> }}
 */
export function buildShogiPalace(THREE) {
  const root = new THREE.Group();
  root.name = 'Shogi Palace | Draft | +Z entrance';
  root.userData = {
    assetId: 'shogi-palace', version: 'DRAFT-1', units: 'metres',
    footprint: [8.6, 7], forward: [0, 0, 1],
    removableSignName: 'SHOGI_sign_removable',
    geometrySource: 'original-procedural',
  };

  // The only switchable subassembly is the sign. Everything else is batched.
  const signRoot = new THREE.Group();
  signRoot.name = 'SHOGI_sign_removable';
  signRoot.userData.removableSign = true;
  root.add(signRoot);

  const P = {
    cedar: new THREE.MeshStandardMaterial({color: 0x352c2b, roughness: 0.88}),
    cedarMid: new THREE.MeshStandardMaterial({color: 0x5e4137, roughness: 0.82}),
    cedarEdge: new THREE.MeshStandardMaterial({color: 0x84604a, roughness: 0.79}),
    stone: new THREE.MeshStandardMaterial({color: 0x8e9da5, roughness: 0.95}),
    stoneLight: new THREE.MeshStandardMaterial({color: 0xc0cbd0, roughness: 0.95}),
    ice: new THREE.MeshStandardMaterial({color: 0x547e9a, metalness: 0.13, roughness: 0.31, flatShading: true}),
    iceLight: new THREE.MeshStandardMaterial({color: 0x9bc9dc, metalness: 0.08, roughness: 0.3, flatShading: true}),
    roof: new THREE.MeshStandardMaterial({color: 0x303f50, roughness: 0.8, side: THREE.DoubleSide}),
    roofAlt: new THREE.MeshStandardMaterial({color: 0x405065, roughness: 0.78, side: THREE.DoubleSide}),
    roofLip: new THREE.MeshStandardMaterial({color: 0x526071, roughness: 0.77, side: THREE.DoubleSide}),
    snow: new THREE.MeshStandardMaterial({color: 0xdcebf0, roughness: 0.94, flatShading: true, side: THREE.DoubleSide}),
    snowBright: new THREE.MeshStandardMaterial({color: 0xf2f5f4, roughness: 0.92, flatShading: true, side: THREE.DoubleSide}),
    screen: new THREE.MeshStandardMaterial({color: 0xf6ddbb, roughness: 0.98, emissive: 0x8e4f1f, emissiveIntensity: 0.26, side: THREE.DoubleSide}),
    screenDim: new THREE.MeshStandardMaterial({color: 0xcebba3, roughness: 0.98, emissive: 0x563718, emissiveIntensity: 0.21, side: THREE.DoubleSide}),
    amber: new THREE.MeshStandardMaterial({color: 0xffbd66, roughness: 0.5, emissive: 0xff8b38, emissiveIntensity: 0.82, side: THREE.DoubleSide}),
    brass: new THREE.MeshStandardMaterial({color: 0xc8a15c, metalness: 0.58, roughness: 0.36}),
    brassDark: new THREE.MeshStandardMaterial({color: 0x795d3b, metalness: 0.52, roughness: 0.5}),
    interior: new THREE.MeshStandardMaterial({color: 0x8e5c43, roughness: 0.94, emissive: 0x6b3010, emissiveIntensity: 0.2}),
    mat: new THREE.MeshStandardMaterial({color: 0x9a9b72, roughness: 0.96}),
  };

  // Geometry batching: each named palette entry produces one buffer mesh.
  // The sign is batched separately, allowing signRoot.visible = false.
  const batches = new Map();
  const signBatches = new Map();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);

  function addGeo(mat, geometry, position = [0,0,0], quaternion = null, scale = [1,1,1], isSign = false) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...position), quaternion || new THREE.Quaternion(), new THREE.Vector3(...scale));
    let g = geometry.clone();
    g.applyMatrix4(m);
    if (g.index) { const flat = g.toNonIndexed(); g.dispose(); g = flat; }
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const target = isSign ? signBatches : batches;
    if (!target.has(mat)) target.set(mat, []);
    target.get(mat).push(g);
  }
  function box(mat,x,y,z,w,h,d,isSign=false) {
    addGeo(mat, unitBox, [x,y,z], null, [w,h,d], isSign);
  }
  function aligned(mat, a, b, width, depth, isSign = false) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const delta = vb.clone().sub(va);
    const q = new THREE.Quaternion().setFromUnitVectors(yAxis, delta.clone().normalize());
    addGeo(mat, unitBox, va.add(vb).multiplyScalar(0.5).toArray(), q,
      [width, delta.length(), depth], isSign);
  }
  function cylinder(mat,x,y,z,rb,rt,h,segments=12,isSign=false) {
    const g = new THREE.CylinderGeometry(rt,rb,h,segments);
    addGeo(mat,g,[x,y,z],null,[1,1,1],isSign); g.dispose();
  }
  function sphere(mat,x,y,z,r,segments=12,rings=8) {
    const g = new THREE.SphereGeometry(r,segments,rings);
    addGeo(mat,g,[x,y,z]);g.dispose();
  }
  function extrude(mat, vertices, depth, position=[0,0,0], bevel=0, isSign=false) {
    const s = new THREE.Shape();
    s.moveTo(vertices[0][0],vertices[0][1]);
    for (let i=1;i<vertices.length;i++) s.lineTo(vertices[i][0],vertices[i][1]);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s,{depth, bevelEnabled:bevel>0,
      steps:1, curveSegments:4, bevelSegments:2,
      bevelSize:bevel, bevelThickness:bevel});
    addGeo(mat,g,position,null,[1,1,1],isSign);g.dispose();
  }
  function quadSlab(mat, topA,topB,topC,topD,thickness) {
    // Vertex order A-B-C-D follows the outward roof half, with undersurface.
    const verts = [topA,topB,topC,topD].map(v=>[...v]);
    const bottom = verts.map(([x,y,z])=>[x,y-thickness,z]);
    const arr = [...verts,...bottom].flat();
    const faces = [0,1,2,0,2,3, 4,6,5,4,7,6,
      0,4,5,0,5,1, 1,5,6,1,6,2, 2,6,7,2,7,3, 3,7,4,3,4,0];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    g.setIndex(faces);g.computeVertexNormals();addGeo(mat,g);g.dispose();
  }
  function irregularStrip(mat, xs, zs, ys, thickness=0.045) {
    // A faceted 3D snow blanket with uneven edge depth, instead of flat decals.
    const verts=[]; const indices=[];
    for(let i=0;i<xs.length;i++) {
      verts.push(xs[i][0],ys[i][0],zs[i]);
      verts.push(xs[i][1],ys[i][1],zs[i]);
      verts.push(xs[i][0],ys[i][0]-thickness,zs[i]);
      verts.push(xs[i][1],ys[i][1]-thickness,zs[i]);
      if(i) {
        const a=(i-1)*4,b=i*4;
        indices.push(a,b,a+1,b,b+1,a+1);
        indices.push(a+2,a+3,b+2,b+2,a+3,b+3);
        indices.push(a,a+2,b,a+2,b+2,b);
        indices.push(a+1,b+1,a+3,a+3,b+1,b+3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setIndex(indices);g.computeVertexNormals();addGeo(mat,g);g.dispose();
  }
  function tile(mat, sign, t0,t1,z0,z1, roof) {
    // A real overlapping, cambered kawara tile; 24 top and 8 lip triangles.
    const {halfWidth,ridgeY,eaveY} = roof;
    const verts=[],ix=[];
    const cols=5,rows=4;
    for(let i=0;i<rows;i++) {
      const u=i/(rows-1),t=t0+(t1-t0)*u;
      for(let j=0;j<cols;j++) {
        const v=j/(cols-1);
        const x=sign*halfWidth*t;
        const y=ridgeY+(eaveY-ridgeY)*t+0.025 + 0.031*Math.sin(Math.PI*v)
                + 0.009*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
        const z=z0+(z1-z0)*v;
        verts.push(x,y,z);
      }
    }
    for(let i=0;i<rows-1;i++) for(let j=0;j<cols-1;j++) {
      const a=i*cols+j,b=a+cols;
      if(sign===1) ix.push(a,b+1,b,a,a+1,b+1);
      else ix.push(a,b,b+1,a,b+1,a+1);
    }
    const base=verts.length/3;
    for(let j=0;j<cols;j++) {
      const v=j/(cols-1),z=z0+(z1-z0)*v;
      const x=sign*halfWidth*t1 + sign*0.012;
      const y=ridgeY+(eaveY-ridgeY)*t1 -0.023+0.031*Math.sin(Math.PI*v);
      verts.push(x,y,z);
      if(j>0){
        const topA=(rows-1)*cols+j-1,topB=topA+1;
        const botA=base+j-1,botB=botA+1;
        ix.push(topA,topB,botB,topA,botB,botA);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setIndex(ix);g.computeVertexNormals();addGeo(mat,g);g.dispose();
  }
  function roofVolume(r) {
    const {front,back,halfWidth,ridgeY,eaveY,rows,cols} = r;
    for(const sign of [-1,1]) {
      quadSlab('roof', [0,ridgeY,front],[sign*halfWidth,eaveY,front],
        [sign*halfWidth,eaveY,back],[0,ridgeY,back],.15);
      // The roof's tiled texture is geometry, not a normal map or a flat image.
      for(let row=0;row<rows;row++) for(let k=0;k<cols;k++) {
        const t0=0.018+(row/rows)*0.972;
        const t1=0.018+((row+1)/rows)*0.972;
        const za=back+(front-back)*k/cols;
        const zb=back+(front-back)*(k+1)/cols + .003;
        tile(((row+k)%8===0)?'roofAlt':'roof', sign, t0,t1,za,zb,r);
      }
      // Distinctive straight gables, no curled-up Xiangqi-style roof corners.
      for(const z of [front,back]) {
        aligned('cedar',[0,ridgeY-.095,z],[sign*halfWidth,eaveY-.095,z],.16,.18);
        aligned('roofLip',[0,ridgeY+.04,z+Math.sign(z)*.012],
          [sign*halfWidth,eaveY+.04,z+Math.sign(z)*.012],.075,.18);
        aligned('snowBright',[0,ridgeY+.145,z],
          [sign*halfWidth*.20,ridgeY+(eaveY-ridgeY)*.20+.155,z],.1,.18);
      }
      // Dark under-eave fascia and individual rafter ends, visible at eye height.
      aligned('cedar',[sign*halfWidth,eaveY-.18,back],
        [sign*halfWidth,eaveY-.18,front],.18,.17);
      for(let k=0;k<=Math.round((front-back)/.28);k++) {
        const z=back+(front-back)*k/Math.round((front-back)/.28);
        aligned('cedarEdge',
          [sign*(halfWidth-.45),eaveY+.10,z],
          [sign*(halfWidth+.04),eaveY-.22,z],.085,.09);
        box('cedar',sign*(halfWidth-.20),eaveY-.37,z,.07,.30,.074);
      }
      // Ridge to eave raised tile seams and shallow ornamental ridge cap.
      for(let k=0;k<cols;k++) {
        const z=back+(front-back)*(k+.5)/cols;
        aligned('roofLip',[sign*.22,ridgeY+(eaveY-ridgeY)*.06+.066,z],
          [sign*halfWidth*.96,ridgeY+(eaveY-ridgeY)*.96+.045,z],.038,.024);
      }
      // Snowdrifts accumulate near the eaves and ridge, with nonrepeating edges.
      const n=20, xs=[], zs=[], ys=[];
      for(let k=0;k<=n;k++) {
        const z=back+(front-back)*k/n;
        const wav=.04*Math.sin(k*1.86+sign)+.025*Math.sin(k*.61+3);
        const edgeT=.965;
        const innerT=.76+wav;
        xs.push([sign*halfWidth*innerT,sign*halfWidth*edgeT]);
        zs.push(z);
        ys.push([
          ridgeY+(eaveY-ridgeY)*innerT+.07,
          ridgeY+(eaveY-ridgeY)*edgeT+.095
        ]);
      }
      irregularStrip('snow',xs,zs,ys,.07);
      const ax=[],az=[],ay=[];
      for(let k=0;k<=n;k++) {
        const z=back+(front-back)*k/n;
        const t=.016+.022*(.5+.5*Math.sin(k*1.45+1));
        ax.push([sign*halfWidth*t,sign*halfWidth*(t+.10)]);
        az.push(z);ay.push([
          ridgeY+(eaveY-ridgeY)*t+.10,
          ridgeY+(eaveY-ridgeY)*(t+.10)+.07
        ]);
      }
      irregularStrip('snowBright',ax,az,ay,.04);
      // Scattered compact drifts (no blanket hiding the readable tiles).
      for(let k=0;k<4;k++) {
        const centerT=.35+.12*k;
        const z=back+(front-back)*(.14+.22*k);
        const edge=.11+.035*Math.sin(k+1);
        const x1=sign*halfWidth*(centerT-edge),x2=sign*halfWidth*(centerT+edge);
        const y1=ridgeY+(eaveY-ridgeY)*(centerT-edge)+.065;
        const y2=ridgeY+(eaveY-ridgeY)*(centerT+edge)+.065;
        irregularStrip('snowBright',[[x1,x2],[x1+sign*.06,x2]],
          [z-.10,z+.22],[[y1,y2],[y1,y2]],.035);
      }
    }
    // Cylindrical ridge with actual join detail, original procedural hardware.
    aligned('roofLip',[0,ridgeY+.04,back-.02],
      [0,ridgeY+.04,front+.02],.20,.20);
    aligned('snowBright',[0,ridgeY+.16,back],[0,ridgeY+.16,front],.09,.10);
    for(const z of [back+.12,front-.12]) {
      sphere('brassDark',0,ridgeY+.02,z,.14,14,8);
      sphere('brass',0,ridgeY+.08,z,.065,12,6);
    }
  }
  function gable(z,halfWidth,ridgeY,eaveY,rear=false) {
    const zShift=rear?-.035:-.015;
    extrude('cedar',[
      [-halfWidth*.93,eaveY-.19],[halfWidth*.93,eaveY-.19],
      [0,ridgeY-.13]],.115,[0,0,z+zShift]);
    // Gable's real boarded wood relief: small vertical cedar uprights.
    for(let k=-6;k<=6;k++) {
      const x=k*halfWidth*.115;
      const available=(ridgeY-.17)-(ridgeY-eaveY)*(Math.abs(x)/halfWidth)-(eaveY-.23);
      if(available>.20) {
        box(k%3===0?'cedarEdge':'cedarMid',x,eaveY-.23+available/2,z+.15,
          .045,available,.055);
      }
    }
    aligned('cedarEdge',[-halfWidth*.90,eaveY-.14,z+.22],
      [0,ridgeY-.18,z+.22],.12,.14);
    aligned('cedarEdge',[0,ridgeY-.18,z+.22],
      [halfWidth*.90,eaveY-.14,z+.22],.12,.14);
    aligned('cedar',[0,eaveY+.08,z+.24],[0,ridgeY-.29,z+.24],.10,.12);
    // Herringbone-like braces stay under the roof pitch.
    for(const side of [-1,1]) {
      aligned('cedarEdge',[side*.62,eaveY+.02,z+.24],
        [side*1.42,eaveY+.56,z+.24],.08,.09);
      aligned('cedarMid',[side*1.50,eaveY+.01,z+.24],
        [side*.42,eaveY+.62,z+.24],.055,.085);
    }
  }
  function screenGrid(x,y,z,w,h,side='front',lit=true,railCount=5,colCount=3) {
    // 5 cm recessed frame and 2.5 cm *physical* lattice, with warm opaque backing.
    // For side walls the assembly is rotated about Y.
    const q=side==='left' ? new THREE.Quaternion().setFromAxisAngle(yAxis,-Math.PI/2)
      : side==='right'?new THREE.Quaternion().setFromAxisAngle(yAxis,Math.PI/2)
      : side==='back'?new THREE.Quaternion().setFromAxisAngle(yAxis,Math.PI)
      :new THREE.Quaternion();
    function part(mat,dx,dy,dz,w0,h0,d0) {
      const local = new THREE.Vector3(dx,dy,dz).applyQuaternion(q).add(new THREE.Vector3(x,y,z));
      addGeo(mat,unitBox,local.toArray(),q,[w0,h0,d0]);
    }
    part(lit?'screen':'screenDim',0,0,0,w-.06,h-.06,.048);
    for(const sideSign of [-1,1])
      part('cedarMid',sideSign*(w/2-.038),0,.06,.078,h,.112);
    for(const sideSign of [-1,1])
      part('cedarMid',0,sideSign*(h/2-.038),.06,w,.077,.112);
    for(let i=1;i<colCount;i++)
      part('cedarEdge',-w/2+w*i/colCount,0,.089,.027,h-.12,.048);
    for(let i=1;i<railCount;i++)
      part('cedarEdge',0,-h/2+h*i/railCount,.09,w-.12,.026,.045);
    for(const edge of [-1,1])
      part('brassDark',edge*(w/2-.09),-h/2+.18,.13,.042,.09,.024);
  }
  function pillar(x,z,top=3.37) {
    box('stoneLight',x,.53,z,.34,.21,.34);
    box('cedar',x,1.89,z,.255,top-0.72,.255);
    box('cedarEdge',x,top-.14,z,.39,.16,.37);
    box('brassDark',x,.73,z,.28,.038,.28);
    // Bearing block and angled split corbels at the intersection with the beam.
    box('cedarMid',x,top-.29,z,.40,.115,.46);
    for(const s of [-1,1]) {
      aligned('cedarEdge',[x+s*.115,top-.72,z],
        [x+s*.31,top-.30,z],.078,.088);
    }
  }
  function stoneLantern(x,z) {
    // Sculpted standing tōrō-inspired lantern; 1.44 m tall, no dynamic light.
    const y0=.01;
    box('stone',x,.11,z,.43,.22,.43);
    box('brassDark',x,.23,z,.34,.035,.34);
    cylinder('cedar',x,.46,z,.12,.10,.48,8);
    box('cedarEdge',x,.75,z,.42,.12,.42);
    box('amber',x,1.006,z,.31,.39,.31);
    for(const dx of [-.18,.18])for(const dz of [-.18,.18]) {
      box('cedar',x+dx,1.01,z+dz,.055,.48,.055);
    }
    for(const h of [.90,1.02,1.14]) {
      box('cedarEdge',x, h, z+.174,.40,.036,.052);
      box('cedarEdge',x, h, z-.174,.40,.036,.052);
      box('cedarEdge',x+.174,h,z,.052,.036,.40);
      box('cedarEdge',x-.174,h,z,.052,.036,.40);
    }
    box('brass',x,1.26,z,.55,.09,.55);
    extrude('cedar',[[ -.32,0],[.32,0],[.235,.16],[-.235,.16]],
      .49,[x,1.30,z-.245]);
    box('snowBright',x,1.475,z,.36,.05,.35);
    cylinder('brass',x,1.53,z,.052,.027,.07,12);
  }

  // ---------------------------------------------------------------------
  // 1. SUBSTRUCTURE, FACETED ICE, APPROACH AND REAL WALKABLE VERANDA
  // ---------------------------------------------------------------------
  box('stone',0,.19,0,8.22,.37,6.70);
  box('stoneLight',0,.385,0,8.05,.07,6.54);
  box('cedar',0,.47,0,7.60,.13,5.91);
  box('cedarMid',0,.55,0,7.55,.045,5.89);
  // Continuous raised veranda deck y=.57, z=.94..2.93. Safe span along X.
  for(let i=0;i<26;i++) {
    const x=-3.61+(i+.5)*7.22/26;
    box(i%4===0?'cedarEdge':'cedarMid',x,.576,1.96,7.22/26-.013,.036,1.91);
  }
  box('cedarEdge',0,.52,2.94,7.32,.15,.11);
  box('cedar',0,.48,1.04,7.42,.13,.11);
  // Stone stair treads actually meet the deck. No blocking front railing.
  const stairZ=[3.390,3.205,3.030];
  for(let i=0;i<3;i++) {
    const yy=.112+i*.153;
    box('stone',0,yy,stairZ[i],2.38,.20,.19);
    box('stoneLight',0,yy+.103,stairZ[i],2.42,.031,.208);
    box('iceLight',-.96,yy+.09,stairZ[i],.32,.026,.205);
    box('iceLight', .96,yy+.09,stairZ[i],.32,.026,.205);
  }
  // Icier articulated boulders clad the platform, with usable top clear.
  for(const side of [-1,1])for(let i=0;i<7;i++) {
    const z=-2.82+i*.91;
    const x=side*(3.93+.07*Math.sin(i*1.4));
    extrude(i%2?'ice':'iceLight',[
      [-.24,0],[.28,0],[.30,.16],[.11,.29],[-.16,.23]],
      .16,[x,.1,z]);
    box('snow',x,.355,z,.32,.07,.26);
  }
  for(const z of [-3.28,3.07])for(let i=-8;i<=8;i++) {
    const x=i*.45;
    if(z>0 && Math.abs(x)<1.35)continue;
    box(i%4===0?'iceLight':'stoneLight',x,.32,z,.39,.11,.11);
  }
  // Deck edge ice, deliberately not where the player enters.
  for(let i=-6;i<=6;i++) {
    if(Math.abs(i)<=2)continue;
    const x=i*.48;
    box('snowBright',x,.626,2.98,.35,.047,.17);
  }

  // ---------------------------------------------------------------------
  // 2. FULL THREE-DIMENSIONAL WALLS AND RECESSED SHOJI ENTRANCE
  // ---------------------------------------------------------------------
  // Rear solid cedar wall, finished as carefully as the front.
  box('cedar',0,1.78,-2.89,7.04,2.54,.23);
  box('cedarMid',0,3.08,-2.91,7.21,.20,.35);
  for(const x of [-3.31,3.31]) {
    box('cedar',x,1.87,-.90,.25,2.76,4.06);
    box('cedarEdge',x,2.93,-.90,.27,.10,4.08);
    box('cedarMid',x,.68,-.90,.25,.12,4.1);
  }
  // Interior entry bay has physical side walls, raised mats and a warm back.
  box('interior',0,1.8,-2.54,5.56,2.42,.05);
  box('cedarMid',0,3.0,-.78,5.75,.16,3.57);
  for(let j=0;j<6;j++)for(let i=0;i<4;i++) {
    box((i+j)%2?'mat':'stoneLight',-2.14+i*1.42,.595,-1.99+j*.50,
      1.38,.035,.47);
  }
  // A soft amber-lit inner alcove, visible through the open sliding door.
  box('cedar',0,1.77,-2.50,2.20,2.18,.10);
  box('screen',0,1.90,-2.425,1.88,1.66,.055);
  for(const xx of [-.94,0,.94])box('cedarMid',xx,1.89,-2.37,.05,1.73,.065);
  for(const yy of [1.17,1.60,2.03,2.46])box('cedarEdge',0,yy,-2.35,1.91,.031,.06);
  // Interior small roof-like alcove over a geometric Shogi-piece relief.
  aligned('cedarEdge',[-.93,2.68,-2.24],[0,2.92,-2.24],.10,.12);
  aligned('cedarEdge',[0,2.92,-2.24],[.93,2.68,-2.24],.10,.12);
  // Ceiling beams, interior rim and warm hanging light source (emissive).
  for(const xx of [-2.8,-1.4,0,1.4,2.8])
    aligned('cedarEdge',[xx,2.89,-2.45],[xx,2.89,.95],.12,.17);
  cylinder('brassDark',0,2.60,-.75,.18,.11,.16,12);
  cylinder('amber',0,2.44,-.75,.115,.145,.24,10);
  cylinder('cedar',0,2.28,-.75,.17,.13,.05,12);
  // Shoji windows across front facade, then a clear asymmetrical sliding opening.
  screenGrid(-2.25,1.87,1.015,2.16,2.30,'front',true,6,4);
  screenGrid( 2.25,1.87,1.015,2.16,2.30,'front',true,6,4);
  for(const x of [-3.42,-1.09,1.09,3.42]) {
    box('cedar',x,1.83,1.00,.13,2.83,.23);
  }
  box('cedar',0,3.07,1.0,7.17,.23,.27);
  box('cedarMid',0,.70,1.0,7.10,.13,.29);
  box('cedarEdge',0,2.95,1.14,2.40,.08,.075); // door header
  box('brassDark',0,.702,1.17,2.32,.019,.05); // sliding track
  // A single shifted door leaf occupies x=.44..1.36; the left 1.43 m
  // is genuinely open. The visible bay behind is geometry, not a picture.
  screenGrid(.92,1.85,.86,.92,2.22,'front',false,6,2);
  box('brass',.50,1.72,1.03,.035,.14,.042); // pull
  box('cedarMid',-1.06,1.80,1.06,.065,2.28,.13);
  // Real side-wall screens and alcove trim, on BOTH lateral facades.
  for(const side of [-1,1]) {
    const X=side*3.44;
    for(const z of [-2.05,-.85,.26])
      screenGrid(X,1.84,z,.85,1.60,side===-1?'left':'right',true,5,2);
    for(const z of [-2.54,-1.48,-.42,.65]) {
      box('cedarMid',side*3.52,1.81,z,.08,2.52,.09);
    }
    box('cedarEdge',side*3.53,2.69,-1.0,.085,.10,3.61);
    box('cedarMid',side*3.53,1.06,-1.0,.07,.10,3.61);
  }
  // Articulated rear panels, recessed screen bands and covered timber posts.
  for(const x of [-2.35,0,2.35])
    screenGrid(x,1.87,-3.028,1.50,1.64,'back',x!==0,5,3);
  for(const x of [-3.42,-1.17,1.17,3.42])
    box('cedarEdge',x,1.82,-3.015,.125,2.55,.12);
  box('cedarMid',0,2.79,-3.065,7.1,.18,.18);
  box('cedarEdge',0,1.06,-3.065,7.1,.13,.16);

  // ---------------------------------------------------------------------
  // 3. TIMBER VERANDA, EXPOSED JOINTS, BRACKETS, FRONTS AND REAR
  // ---------------------------------------------------------------------
  for(const x of [-3.14,-1.85,1.85,3.14])pillar(x,2.70,3.43);
  for(const x of [-3.20,3.20])pillar(x,-2.70,3.40);
  for(const z of [.99,2.70]) {
    box('cedar',0,3.36,z,7.05,.28,.32);
    box('cedarEdge',0,3.18,z,7.16,.105,.39);
    for(const x of [-3.14,-1.85,1.85,3.14]) {
      box('cedarEdge',x,3.44,z,.41,.11,.44);
      // Beam-post mortise relief and paired bracket blocks.
      box('brassDark',x,3.14,z+.169,.088,.05,.025);
    }
  }
  // Open sides at the veranda: short handrail only beyond the walkable zone.
  for(const x of [-3.67,3.67]) {
    box('cedar',x,1.10,1.76,.10,.10,.93);
    box('cedarMid',x,.77,1.76,.09,.068,.93);
    for(const z of [1.29,2.23]) {
      box('cedar',x,.98,z,.12,.65,.12);
      box('brassDark',x,1.33,z,.14,.037,.13);
    }
  }
  // Visible floor joist ends at entrance front from oblique and low views.
  for(let i=0;i<=22;i++) {
    const x=-3.45+i*.315;
    box('cedar',x,.42,2.93,.115,.13,.24);
  }
  // Side roof attachment volumes: the rear building has full wall depths.
  for(const s of [-1,1])for(const z of [-2.23,-1.10,.05]) {
    aligned('cedarEdge',[s*3.29,2.70,z],[s*3.55,3.04,z],.09,.1);
  }
  // Long inner posts and side lintels; no facade-only optical illusion.
  for(const side of [-1,1]) {
    aligned('cedarMid',[side*3.43,2.90,-2.85],
      [side*3.43,2.90,1.05],.15,.20);
    for(const z of [-2.56,-1.35,-.16,.95])
      box('cedarEdge',side*3.42,2.47,z,.13,.10,.12);
  }

  // ---------------------------------------------------------------------
  // 4. TWO CONNECTED GABLED ROOF VOLUMES, HIGH FRONT / LONG REAR RIDGE
  // ---------------------------------------------------------------------
  // Rear roof joins beneath front higher roof around z=.25..+.7.
  const rearRoof={front:.62,back:-3.45,halfWidth:4.08,ridgeY:5.16,
      eaveY:3.14,rows:8,cols:17};
  const frontRoof={front:3.35,back:.15,halfWidth:3.87,ridgeY:5.79,
      eaveY:3.33,rows:9,cols:14};
  roofVolume(rearRoof);
  // External rear gable can be viewed all the way around the palace.
  gable(-3.39,3.95,5.16,3.14,true);
  roofVolume(frontRoof);
  gable(3.06,3.77,5.79,3.33,false);
  // Overlap transition boards and flashing make two volumes intelligible.
  box('cedar',0,3.44,.59,7.20,.21,.18);
  box('brassDark',0,3.575,.60,6.94,.048,.10);
  // Snow fills near the valley, not an implausible floating separate roof.
  for(const s of [-1,1]) {
    aligned('snow',[s*2.18,4.00,.56],[s*3.45,3.44,.56],.15,.25);
  }
  // Repeated understated facade motifs under front gable eaves.
  for(const s of [-1,1]) {
    for(let i=0;i<4;i++) {
      const x=s*(.82+i*.56);
      const roofY=frontRoof.ridgeY+(frontRoof.eaveY-frontRoof.ridgeY)*Math.abs(x)/frontRoof.halfWidth;
      aligned('cedarMid',[x,3.44,3.22],
        [x,roofY-.17,3.22],.064,.115);
    }
  }
  // Sculptural pentagonal Shogi piece emblem in wooden front gable.
  extrude('brassDark',[[0,.39],[.39,.13],[.30,-.34],[-.30,-.34],[-.39,.13]],
    .080,[0,4.44,3.24],.018);
  extrude('brass',[[0,.28],[.28,.085],[.215,-.24],[-.215,-.24],[-.28,.085]],
    .046,[0,4.44,3.33],.014);
  for(const shift of [-.11,.11])
    aligned('cedar',[shift,4.38,3.44],[shift,4.60,3.44],.032,.033);
  aligned('cedar',[-.12,4.37,3.45],[.12,4.37,3.45],.036,.036);

  // ---------------------------------------------------------------------
  // 5. WARM LANTERNS, DELICATE DETAILS, REMOVABLE SIGN
  // ---------------------------------------------------------------------
  stoneLantern(-1.65,3.18);
  stoneLantern( 1.65,3.18);
  // Torii-style top beam detail, deliberately not a separate pavilion roof.
  box('cedarMid',0,2.93,2.795,3.15,.16,.19);
  for(const x of [-1.73,1.73])
    box('brass',x,2.93,2.92,.07,.16,.026);
  // Discreet ice-glass ornaments on wall posts, never obstructing the path.
  for(const x of [-3.14,3.14]) {
    extrude('iceLight',[[0,.17],[.09,.01],[.065,-.15],[-.065,-.15],[-.09,.01]],
      .035,[x,1.85,2.87],.009);
  }
  // Small *removable* hanging sign, geometry only; letter glyphs via strokes.
  // Do not erase the permanent architectural pentagonal Shogi emblem.
  box('brassDark',0,2.87,3.020,1.31,.38,.075,true);
  box('cedar',0,2.87,3.077,1.23,.30,.063,true);
  for(const xx of [-.53,.53]) {
    cylinder('brass',xx,3.11,3.058,.022,.022,.14,10,true);
    box('brass',xx,3.19,3.05,.06,.03,.08,true);
  }
  // Minimal legible capital lettering made of brass stroke geometry.
  // Each uppercase glyph stays real 3D geometry; no fonts downloaded.
  const strokes={
    S:[[[.7,.84],[.13,.84]],[[.13,.84],[.13,.53]],[[.13,.53],[.7,.53]],[[.7,.53],[.7,.17]],[[.7,.17],[.13,.17]]],
    H:[[[.13,.86],[.13,.16]],[[.70,.86],[.70,.16]],[[.13,.51],[.70,.51]]],
    O:[[[.16,.18],[.16,.82]],[[.16,.82],[.67,.82]],[[.67,.82],[.67,.18]],[[.67,.18],[.16,.18]]],
    G:[[[.71,.82],[.17,.82]],[[.17,.82],[.17,.18]],[[.17,.18],[.71,.18]],[[.71,.18],[.71,.48]],[[.71,.48],[.45,.48]]],
    I:[[[.12,.83],[.71,.83]],[[.41,.83],[.41,.17]],[[.12,.17],[.71,.17]]]
  };
  const word='SHOGI', scale=.146, gap=.238;
  for(let i=0;i<word.length;i++) {
    const cx=(i-2)*gap;
    for(const [a,b] of strokes[word[i]]) {
      aligned('brass',[cx+(a[0]-.415)*scale,2.87+(a[1]-.5)*.27,3.134],
        [cx+(b[0]-.415)*scale,2.87+(b[1]-.5)*.27,3.134],.017,.014,true);
    }
  }

  // ---------------------------------------------------------------------
  // 6. MERGE BY MATERIAL: geometry remains legitimate three-dimensional data
  // ---------------------------------------------------------------------
  function flush(groups, parent) {
    for(const [matName, parts] of groups) {
      const count = parts.reduce((sum,g)=>sum+g.getAttribute('position').count,0);
      const position=new Float32Array(count*3);
      const normal=new Float32Array(count*3);
      let offset=0;
      for(const g of parts) {
        const p=g.getAttribute('position');const n=g.getAttribute('normal');
        position.set(p.array,offset*3);normal.set(n.array,offset*3);
        offset+=p.count;g.dispose();
      }
      const merged=new THREE.BufferGeometry();
      merged.setAttribute('position',new THREE.BufferAttribute(position,3));
      merged.setAttribute('normal',new THREE.BufferAttribute(normal,3));
      merged.computeBoundingBox();merged.computeBoundingSphere();
      const mesh=new THREE.Mesh(merged,P[matName]);
      mesh.name=(parent===signRoot?'sign/':'palace/')+matName;
      mesh.castShadow=true;mesh.receiveShadow=true;
      parent.add(mesh);
    }
  }
  flush(batches,root);
  flush(signBatches,signRoot);

  // Marker Object3Ds are root children, not the meshes, to keep stable names.
  const anchors={};
  const places={
    door:[0,.61,1.00],
    sign:[0,2.87,3.04],
    leftLantern:[-1.65,0,3.18],
    rightLantern:[1.65,0,3.18],
  };
  for(const [name,xyz] of Object.entries(places)) {
    const anchor=new THREE.Object3D();
    anchor.name='anchor/'+name;
    anchor.position.set(...xyz);anchor.userData.anchorName=name;
    root.add(anchor);anchors[name]=anchor;
  }

  // Collision boxes are asset-local and limited to SOLID pedestrian obstacles.
  // NO collider around the veranda, roof, eaves, or the open doorway span.
  const colliders=[
    {name:'left_side_wall',center:[-3.41,1.78,-.95],size:[.26,2.54,3.94]},
    {name:'right_side_wall',center:[3.41,1.78,-.95],size:[.26,2.54,3.94]},
    {name:'rear_wall',center:[0,1.78,-2.89],size:[7.04,2.54,.23]},
    {name:'front_left_screen',center:[-2.25,1.87,1.015],size:[2.17,2.30,.13]},
    {name:'front_right_screen',center:[2.25,1.87,1.015],size:[2.17,2.30,.13]},
    {name:'partly_open_door_leaf',center:[.92,1.85,.86],size:[.92,2.22,.12]},
    ...[-3.14,-1.85,1.85,3.14].map((x,i)=>({
      name:'veranda_post_'+i,center:[x,1.91,2.70],size:[.255,2.76,.255]
    })),
    {name:'left_lantern',center:[-1.65,.78,3.18],size:[.56,1.56,.56]},
    {name:'right_lantern',center:[1.65,.78,3.18],size:[.56,1.56,.56]},
  ];
  root.userData.collisionConvention='asset-local axis-aligned boxes, centre and size [x,y,z]';
  return {root,colliders,anchors};
}
