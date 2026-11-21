/**
 * Antarctic Kingdoms • Lantern Harbor • Chaturanga Temple (DRAFT)
 * Original procedural geometry. Three.js 0.185.1 integration contract.
 * Local units: metres. Finished floor: Y=0. Front/entrance: +Z.
 * Export: buildChaturangaTemple(THREE) => {root, colliders, anchors}.
 * No renderer, controls, DOM, timers, network, or global listeners.
 */
export function buildChaturangaTemple(THREE) {
  const root = new THREE.Group();
  root.name = 'Chaturanga Temple • DRAFT';
  root.userData.assetId = 'antarctic-kingdoms/chaturanga-temple';
  root.userData.status = 'DRAFT';
  root.userData.units = 'metres';
  root.userData.footprint = [9, 8];
  root.userData.floorY = 0;
  root.userData.front = '+Z';

  const mk = (color, roughness=.78, metalness=0, emissive=0x000000, emissiveIntensity=0) =>
    new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity,flatShading:false, side:THREE.DoubleSide});
  const M = {
    limestone: mk(0xe7dfce,.91),
    carved: mk(0xfff0d2,.87),
    coolStone: mk(0x9eaeaf,.92),
    shade: mk(0x657886,.92),
    brass: mk(0xc9a465,.47,.64),
    oldBrass: mk(0x7e6240,.56,.45),
    sapphire: mk(0x123d77,.31,.14),
    midnight: mk(0x102b4b,.44,.12),
    ice: mk(0x3c9fdf,.22,.18,0x0c2856,.08),
    iceLip: mk(0x8cd8f0,.28,.04),
    snow: mk(0xf5f6ee,.97),
    snowBlue: mk(0xc7e5f2,.94),
    door: mk(0x442f2c,.8),
    amber: mk(0xffb35d,.38,.0,0xf07a19,1.35),
    amberLow: mk(0xb97632,.68,.05,0x9b400d,.48),
    floor: mk(0x9bb2b5,.88),
  };
  // This mesh baker combines any number of detailed modules into one draw per material.
  // Sign and scale marker remain independently switchable in the viewer.
  function baker() {
    const bins = new Map();
    const vec = new THREE.Vector3();
    const nor = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const normMat = new THREE.Matrix3();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    function add(g, material, x=0,y=0,z=0, sx=1,sy=1,sz=1, rx=0,ry=0,rz=0) {
      position.set(x,y,z); scale.set(sx,sy,sz); euler.set(rx,ry,rz,'XYZ');
      quat.setFromEuler(euler); matrix.compose(position,quat,scale);
      normMat.getNormalMatrix(matrix);
      const geo = g.index ? g.toNonIndexed() : g;
      const p=geo.getAttribute('position'), n=geo.getAttribute('normal'), u=geo.getAttribute('uv');
      if(!p) throw new Error('Geometry must supply positions');
      if(!bins.has(material)) bins.set(material,{p:[],n:[],uv:[]});
      const b=bins.get(material);
      for(let i=0;i<p.count;i++) {
        vec.set(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(matrix);
        b.p.push(vec.x,vec.y,vec.z);
        if(n) nor.set(n.getX(i),n.getY(i),n.getZ(i)).applyMatrix3(normMat).normalize();
        else nor.set(0,1,0);
        b.n.push(nor.x,nor.y,nor.z);
        b.uv.push(u?u.getX(i):0,u?u.getY(i):0);
      }
      if (geo!==g) geo.dispose();
    }
    function finalize(target,prefix='temple') {
      let meshes=0, tris=0;
      for(const [material,b] of bins) {
        if(!b.p.length) continue;
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
        geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
        geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));
        geo.computeBoundingSphere();
        const mesh=new THREE.Mesh(geo,material);
        mesh.name=`${prefix}.${String(meshes+1).padStart(2,'0')}`;
        mesh.castShadow=true; mesh.receiveShadow=true;
        target.add(mesh); meshes++; tris+=b.p.length/9;
      }
      return {meshes,triangles:tris};
    }
    return {add,finalize};
  }
  const B=baker();
  const cube=new THREE.BoxGeometry(1,1,1);
  const oct=new THREE.OctahedronGeometry(1,0);
  const cyl8=new THREE.CylinderGeometry(1,1,1,8,1);
  const cyl12=new THREE.CylinderGeometry(1,1,1,12,1);
  const torus=new THREE.TorusGeometry(1,.09,5,16);
  const box=(mat,x,y,z,w,h,d,ry=0,rx=0,rz=0) => B.add(cube,M[mat],x,y,z,w,h,d,rx,ry,rz);
  const poly=(mat,g,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0) => B.add(g,M[mat],x,y,z,sx,sy,sz,rx,ry,rz);
  function shapePrism(points,depth, bevel=.0) {
    const shape=new THREE.Shape();
    points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSegments:1,steps:1,
      bevelThickness:bevel,bevelSize:bevel,curveSegments:3});
    // Three extrusions start at local Z=0. We keep this convention for arch projections.
    return g;
  }
  function bevelSlab(w,d,h,edge=.05) {
    const s=new THREE.Shape();s.moveTo(-w/2,-d/2);s.lineTo(w/2,-d/2);s.lineTo(w/2,d/2);s.lineTo(-w/2,d/2);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:h,steps:1,bevelEnabled:true,bevelSegments:1,bevelThickness:edge,bevelSize:edge,curveSegments:2});
    g.rotateX(-Math.PI/2); // X/Z plan view, Y thickness
    return g;
  }
  function latheColumn(x,z,scale=1,mat='carved',height=3.35) {
    // Profile deliberately includes a broad base, narrowing fluted shaft and corbel capital.
    const p=[[0,0],[.28,0],[.36,.035],[.36,.14],[.29,.19],[.245,.24],[.22,.34],
      [.205,.45],[.203,.60],[.20,.72],[.19,1.70],[.215,2.24],[.23,2.50],
      [.25,2.61],[.32,2.68],[.34,2.76],[.32,2.83],[.42,2.92],[.42,3.06],[.34,3.12]];
    const gg=new THREE.LatheGeometry(p.map(v=>new THREE.Vector2(v[0],v[1]*height/3.12)),10,0,Math.PI*2);
    poly(mat,gg,x,0,z,scale,1,scale);
    // Flutes are real narrow shafts; the ribs occupy only the readable middle zone.
    for(let k=0;k<6;k++){
      const a=k*Math.PI/3;
      poly('coolStone',cyl12,x+Math.cos(a)*.198*scale,height*.49,z+Math.sin(a)*.198*scale,
        .017*scale,height*.51,.017*scale);
    }
    for(const t of [.35,.66,2.62,2.83]) {
      poly('brass',cyl12,x,t*height/3.12,z,.24*scale,.025,.24*scale);
    }
    // Four diagonal corner scrolls beneath the lintel, visibly supporting the beam.
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      box('limestone',x+sx*.32*scale,height-.11,z+sz*.23*scale,.20*scale,.17,.22*scale,0,0,sx*.35);
    }
  }
  function ringCornice(w,d,y,z,kind='limestone',height=.20) {
    // Six explicit horizontal silhouette changes create a sculpted, undercut profile.
    const o=[-.06,.09,.21,.18,.27,.31,.29];
    const hs=[0,.035,.07,.115,.155,.205,.238].map(q=>q*height/.238);
    for(let i=0;i<o.length-1;i++) {
      const a=o[i],b=o[i+1],ya=y+hs[i],yb=y+hs[i+1];
      // Four sloping quadrilateral bands assembled into a closed profile ring.
      const v=[];
      const ring=(ofs,yy)=>[
        [-w/2-ofs,yy,z-d/2-ofs],[w/2+ofs,yy,z-d/2-ofs],
        [w/2+ofs,yy,z+d/2+ofs],[-w/2-ofs,yy,z+d/2+ofs]
      ];
      const aa=ring(a,ya),bb=ring(b,yb);
      for(let j=0;j<4;j++){
        const k=(j+1)%4;
        v.push(...aa[j],...aa[k],...bb[k],...aa[j],...bb[k],...bb[j]);
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();
      B.add(g,M[(i===2||i===5)?'carved':kind]);
      g.dispose();
    }
  }
  function taperBody(w0,d0,w1,d1,h) {
    const p=[];
    const rings=[[[ -w0/2,0,-d0/2],[ w0/2,0,-d0/2],[w0/2,0,d0/2],[-w0/2,0,d0/2]],
      [[-w1/2,h,-d1/2],[w1/2,h,-d1/2],[w1/2,h,d1/2],[-w1/2,h,d1/2]]];
    for(let s=0;s<4;s++) {
      const q=(s+1)%4, a=rings[0][s],b=rings[0][q],c=rings[1][q],d=rings[1][s];
      p.push(...a,...b,...c,...a,...c,...d);
    }
    p.push(...rings[1][0],...rings[1][2],...rings[1][1],...rings[1][0],...rings[1][3],...rings[1][2]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
  }
  function archRidge(w,h,depth=.10) {
    // A shallow pointed arch, built as a true solid architectural extrude.
    const pts=[[-w/2,0],[-w/2,h*.70],[-w*.27,h*.84],[0,h],[w*.27,h*.84],[w/2,h*.70],[w/2,0]];
    return shapePrism(pts,depth,.008);
  }
  function littleGable(w,h,depth) {
    return shapePrism([[-w/2,0],[-w*.53,h*.25],[0,h],[w*.53,h*.25],[w/2,0]],depth,.015);
  }
  function faceCoordinates(theta,cx,cz,u=0,out=0){
    return [cx+Math.cos(theta)*u+Math.sin(theta)*out,cz-Math.sin(theta)*u+Math.cos(theta)*out];
  }
  function faceBox(mat,theta,cx,cz,u,y,out,w,h,d) {
    const [x,z]=faceCoordinates(theta,cx,cz,u,out);
    box(mat,x,y,z,w,h,d,theta);
  }
  function bay(theta,cx,cz,u,y,w=.68,h=.67,depth=0) {
    // Deep recessed panel, jambs, sill, an actual arch and miniature five-ridge canopy.
    faceBox('midnight',theta,cx,cz,u,y+h*.48,depth-.045,w*.75,h*.86,.035);
    faceBox('ice',theta,cx,cz,u,y+h*.45,depth-.023,w*.61,h*.62,.027);
    faceBox('limestone',theta,cx,cz,u-w*.40,y+h*.49,depth+.030,w*.085,h*.87,.10);
    faceBox('limestone',theta,cx,cz,u+w*.40,y+h*.49,depth+.030,w*.085,h*.87,.10);
    faceBox('carved',theta,cx,cz,u,y+h*.92,depth+.04,w*.91,h*.075,.11);
    faceBox('shade',theta,cx,cz,u,y+h*.075,depth+.047,w*.91,h*.075,.13);
    for(let b=-1;b<=1;b++) faceBox('brass',theta,cx,cz,u+b*w*.18,y+h*.53,depth+.013,w*.025,h*.53,.021);
    const [x,z]=faceCoordinates(theta,cx,cz,u,depth+.078);
    poly('carved',littleGable(w*.94,h*.23,.15),x,y+h*.93,z,1,1,1,0,theta,0);
    poly('sapphire',littleGable(w*.76,h*.15,.12),x,y+h*.955,z+.007*Math.cos(theta),1,1,1,0,theta,0);
    faceBox('snowBlue',theta,cx,cz,u,y+h*1.16,depth+.06,w*.62,h*.036,.16);
  }
  function steppedMiniature(theta,cx,cz,u,y,s=1) {
    // Roofed little shrine forms used with measured rhythm, not arbitrary ornament.
    faceBox('limestone',theta,cx,cz,u,y+.052*s,.11*s,.40*s,.11*s,.26*s);
    faceBox('sapphire',theta,cx,cz,u,y+.19*s,.15*s,.32*s,.20*s,.25*s);
    const [x,z]=faceCoordinates(theta,cx,cz,u,.04);
    poly('carved',littleGable(.46*s,.20*s,.34*s),x,y+.19*s,z,1,1,1,0,theta,0);
    poly('snow',oct,x,y+.39*s,z,.09*s,.08*s,.09*s);
  }
  function corbelRow(theta,cx,cz,halfWidth,y,step=.48) {
    const n=Math.floor((2*halfWidth-.35)/step);
    for(let i=0;i<=n;i++){
      const u=-halfWidth+.18+(2*halfWidth-.36)*i/n;
      faceBox('coolStone',theta,cx,cz,u,y,.10,.16,.20,.24);
      faceBox('carved',theta,cx,cz,u,y+.08,.20,.23,.08,.31);
      faceBox('oldBrass',theta,cx,cz,u,y+.11,.255,.12,.04,.20);
    }
  }
  function frostRail(theta,cx,cz,halfWidth,y) {
    // Patchy snow along tier ledges; bright top with cobalt shaded under-edge.
    const n=Math.ceil((2*halfWidth)/.86);
    for(let i=0;i<n;i++){
      const u=-halfWidth+(i+.5)*(2*halfWidth/n);
      const shift=(i%4)*.018;
      faceBox(i%3===0?'snowBlue':'snow',theta,cx,cz,u,y+.017,.175,.55*(2*halfWidth/n),.052+shift,.33);
    }
  }
  const lanternGeom=[];
  function lantern(x,y,z,scale=1) {
    // Copper arm, true faceted framed glass, brass cap and hanging sapphire drop.
    box('oldBrass',x,y+.40*scale,z-.19*scale,.10*scale,.78*scale,.12*scale);
    box('brass',x,y+.76*scale,z-.01*scale,.40*scale,.095*scale,.44*scale);
    poly('amber',cyl8,x,y+.36*scale,z,.23*scale,.40*scale,.23*scale);
    poly('oldBrass',cyl8,x,y+.61*scale,z,.29*scale,.085*scale,.29*scale);
    poly('oldBrass',cyl8,x,y+.10*scale,z,.29*scale,.085*scale,.29*scale);
    for(let a=0;a<8;a++){
      const t=a*Math.PI/4;
      box('brass',x+Math.cos(t)*.24*scale,y+.34*scale,z+Math.sin(t)*.24*scale,.046*scale,.44*scale,.046*scale);
    }
    poly('ice',oct,x,y-.02*scale,z,.115*scale,.19*scale,.115*scale);
    lanternGeom.push([x,y,z]);
  }

  // ------------ FOUNDATION AND ENTRY (Y=0 finished floor) ------------
  box('shade',0,-.17,-1.39,8.55,.34,5.03);
  box('coolStone',0,-.105,1.20,7.30,.21,2.97);
  box('floor',0,-.022,-.56,7.35,.044,6.58);
  box('limestone',0,-.045,2.94,3.24,.09,.77);
  box('oldBrass',0,.009,2.83,2.50,.021,.11);
  // Three actual descending outdoor treads; top threshold and interior finished floor are Y=0.
  box('coolStone',0,-.325,3.84,3.80,.13,.33);
  box('limestone',0,-.245,3.59,3.65,.29,.34);
  box('limestone',0,-.175,3.30,3.48,.35,.36);
  for(let j=0;j<3;j++){
    const z=3.84-j*.27;
    box('brass',0,-.255+j*.115,z+.15,3.1,.018,.024);
    for(const s of [-1,1]){
      poly('snow',bevelSlab(.32,.32,.055,.015),s*(1.74-j*.08),-.18+j*.065,z-.13,1,1,1);
    }
  }
  // Entrance plinth returns; ice inset stone blocks, hand-carved stringcourse.
  for(const s of [-1,1]) {
    box('coolStone',s*2.65,.31,2.45,1.38,.59,1.68);
    box('limestone',s*2.65,.69,2.45,1.53,.12,1.78);
    for(let k=0;k<3;k++) box(k===1?'ice':'limestone',s*(2.16+k*.48),.35,3.30,.30,.28,.085);
    box('snow',s*2.55,.795,3.18,1.45,.077,.28);
  }
  // Inlaid corridor: brass guide tracks, geometric stone triangles and low blue tile borders.
  for(const x of [-1.12,1.12]) box('brass',x,.008,-.36,.035,.015,6.43);
  for(let z=-3.15;z<2.75;z+=.74){
    box('coolStone',0,.003,z,2.25,.008,.022);
    for(const x of [-.79,.79]) poly('sapphire',oct,x,.024,z,.09,.022,.09);
  }
  for(let z=-3.0;z<2.6;z+=1.12) for(const x of [-2.94,2.94]) {
    box('sapphire',x,.006,z,.48,.012,.48,Math.PI/4);
    poly('brass',oct,x,.019,z,.09,.02,.09);
  }

  // ------------ LOWER HALL / MANDAPA ------------
  // Side walls use an actual recessed glass plane and recessed panels, not a billboard.
  for(const s of [-1,1]) {
    for(let j=0;j<4;j++){
      const z=-3.25+j*.99;
      box('limestone',s*4.00,.62,z,.31,1.24,.92);
      box('limestone',s*4.00,3.42,z,.31,1.08,.92);
      box('midnight',s*3.82,2.03,z,.06,1.72,.80);
      box('amberLow',s*3.87,2.02,z,.025,1.47,.65);
      box('amber',s*3.885,1.97,z,.013,1.26,.45);
      box('sapphire',s*4.015,1.22,z,.23,.16,.90);
      box('carved',s*4.015,2.90,z,.23,.14,.90);
      box('oldBrass',s*4.04,2.02,z,.06,1.54,.045);
      for(let a=-1;a<=1;a++) box('brass',s*4.055,2.16,z+a*.26,.06,1.45,.028);
      for(let a=0;a<2;a++) box('brass',s*4.055,1.65+a*.65,z,.06,.022,.78);
    }
    for(let j=0;j<=4;j++){
      const z=-3.77+j*.99;
      box('coolStone',s*4.03,1.91,z,.43,3.78,.25);
      box('carved',s*4.055,3.73,z,.54,.17,.38);
      box('carved',s*4.065,.30,z,.50,.16,.36);
      poly('ice',oct,s*4.22,3.13,z,.11,.20,.11);
    }
    // Inside wall is visible from the walkable corridor.
    box('coolStone',s*3.60,.48,-1.69,.14,.95,4.65);
    for(let k=0;k<3;k++){
      const z=-3.02+k*1.44;
      box('shade',s*3.53,2.23,z,.13,1.40,.13);
      box('carved',s*3.55,2.70,z,.17,.12,.67);
      box('amberLow',s*3.49,2.14,z,.07,.87,.50);
    }
  }
  // Full rear stone wall; triple deep-set windows, returns and entirely modeled rear cornice.
  box('limestone',0,.74,-3.78,8.10,1.48,.29);
  box('limestone',0,3.47,-3.78,8.10,.89,.29);
  for(let k=0;k<3;k++) {
    const x=(k-1)*2.55;
    box('midnight',x,2.24,-3.86,1.64,1.94,.09);
    box('amberLow',x,2.18,-3.92,1.42,1.74,.04);
    box('amber',x,2.15,-3.894,1.11,1.36,.025);
    box('coolStone',x-0.88,2.25,-3.82,.24,2.30,.30);
    box('coolStone',x+0.88,2.25,-3.82,.24,2.30,.30);
    box('carved',x,3.27,-3.79,2.02,.18,.39);
    box('brass',x,2.16,-3.936,.042,1.60,.043);
    box('brass',x,2.16,-3.936,1.32,.042,.044);
    poly('ice',oct,x,3.51,-3.87,.16,.23,.10);
  }
  // From the threshold these INNER window backs are warm, never a blank dark wall.
  for(let k=0;k<3;k++) {
    const x=(k-1)*2.55;
    box('amberLow',x,2.18,-3.569,1.43,1.67,.046);
    box('amber',x,2.09,-3.532,1.03,1.28,.022);
    box('brass',x,2.20,-3.507,.047,1.64,.045);
    box('brass',x,2.15,-3.506,1.31,.042,.043);
  }
  for(const x of [-3.91,-1.27,1.27,3.91]){
    box('coolStone',x,2.26,-3.75,.34,3.18,.38);
    box('carved',x,3.76,-3.75,.50,.19,.48);
    box('snow',x,3.91,-3.76,.48,.07,.47);
  }
  box('oldBrass',0,1.29,-3.97,5.87,.038,.05);
  // Hall structural beams and a readable under-roof soffit.
  box('shade',0,3.86,-1.60,8.23,.31,4.72);
  box('limestone',0,4.15,-1.60,8.40,.26,4.78);
  for(let z=-3.41;z<=.30;z+=.77) {
    box('carved',0,3.64,z,7.35,.16,.18);
    box('oldBrass',0,3.55,z,6.98,.028,.038);
  }
  // Low colonnade interior, not planar: the player can look between these columns.
  for(const x of [-2.43,2.43]) for(const z of [-2.75,-.90]) {
    latheColumn(x,z,.58,'limestone',3.29);
    poly('ice',oct,x,2.98,z,.21,.23,.21);
  }
  // A secondary axial arch reads as depth when looking past the open gateway.
  for(const s of [-1,1]) {
    latheColumn(s*1.71,-1.34,.43,'limestone',3.00);
    box('carved',s*1.71,3.03,-1.34,.66,.20,.56);
    box('brass',s*1.71,2.91,-1.34,.48,.035,.41);
  }
  box('coolStone',0,3.16,-1.34,3.55,.30,.49);
  box('oldBrass',0,2.965,-1.34,3.18,.043,.33);
  for(const x of [-1.22,0,1.22]) poly('ice',oct,x,3.205,-1.03,.13,.16,.10);
  // Side eaves: underside brackets and triple thickness, four sides finished.
  for(const s of [-1,1]) for(let z=-3.52;z<=.50;z+=.51){
    box('coolStone',s*4.13,3.97,z,.42,.24,.20);
    box('carved',s*4.27,4.08,z,.27,.22,.26);
    box('shade',s*4.32,3.87,z,.24,.09,.23);
  }
  for(const z of [-3.78,.54]) for(let x=-3.9;x<=3.9;x+=.52) {
    box('coolStone',x,3.94,z,.22,.23,.43);
    box('carved',x,4.08,z,.26,.16,.38);
  }
  ringCornice(7.96,4.32,4.00,-1.52,'coolStone',.24);
  // Curved solid roof ribbons: lofted strips have underside, eave lip, and 3D thickness.
  function curvedRoof(side,z0,z1,cap=false){
    const upper=[],lower=[];
    const x0=0, steps=12;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=side*(.045 + 4.27*t);
      const y=5.15 - .69*t - .11*Math.sin(t*Math.PI);
      upper.push([x,y]);lower.push([x,y-.16]);
    }
    const verts=[];
    function q(a,b,c,d){verts.push(...a,...b,...c,...a,...c,...d);}
    const at=(v,z)=>[v[0],v[1],z];
    for(let i=0;i<steps;i++){
      q(at(upper[i],z0),at(upper[i+1],z0),at(upper[i+1],z1),at(upper[i],z1));
      q(at(lower[i],z1),at(lower[i+1],z1),at(lower[i+1],z0),at(lower[i],z0));
    }
    q(at(upper[0],z0),at(upper[0],z1),at(lower[0],z1),at(lower[0],z0));
    q(at(upper[steps],z1),at(upper[steps],z0),at(lower[steps],z0),at(lower[steps],z1));
    for(const z of [z0,z1]) for(let i=0;i<steps;i++)
      q(at(lower[i],z),at(lower[i+1],z),at(upper[i+1],z),at(upper[i],z));
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();
    B.add(g,M[cap?'snow':'sapphire']);g.dispose();
  }
  curvedRoof(-1,-3.98,.67);curvedRoof(1,-3.98,.67);
  // These smaller snow regions form windblown patches, without blanketing all sapphire.
  for(const s of [-1,1]){
    for(let k=0;k<5;k++){
      const z=-3.66+k*.93;
      box('snow',s*3.78,4.58,z,.65,.061,.59,0,0,s*.12);
      box('snowBlue',s*2.30,4.91,z+.21,.35,.046,.36,0,0,s*.18);
    }
    box('iceLip',s*4.26,4.39,-1.58,.15,.17,4.55);
  }
  box('brass',0,5.155,-1.59,.19,.095,4.65);
  box('snowBlue',0,5.22,-1.57,.27,.075,4.64);
  // Rear roof-shrine, purposely smaller and squatter than front gopuram.
  box('limestone',0,5.34,-2.95,2.30,.33,1.48);
  box('coolStone',0,5.60,-2.95,2.02,.28,1.25);
  box('sapphire',0,5.82,-2.95,1.86,.26,1.13);
  for(const s of [-1,1]){
    poly('ice',oct,s*.77,6.13,-2.95,.27,.43,.29);
    box('snow',s*.87,5.89,-2.95,.18,.058,.90);
  }
  poly('ice',oct,0,6.28,-2.95,.47,.68,.39);
  poly('brass',cyl8,0,6.63,-2.95,.18,.10,.18);

  // ------------ PASSAGE: BRACED GATEWAY, OPEN DOUBLE DOORS ------------
  const frontZ=2.77, rearZ=.37;
  // Real walls flanking an honest 2.45m-wide through-opening.
  for(const s of [-1,1]) {
    box('limestone',s*2.42,1.91,1.56,2.17,3.82,2.43);
    box('coolStone',s*1.32,1.84,1.57,.23,3.61,2.48);
    box('shade',s*1.225,1.45,1.51,.045,2.89,2.50);
    box('carved',s*1.46,.24,frontZ,.34,.45,.27);
    // Inner revealed walls visible from a side angle through the gate.
    for(let j=0;j<6;j++){
      const z=2.58-j*.37;
      box(j%2?'carved':'coolStone',s*1.245,1.78,z,.064,2.73,.045);
      box('brass',s*1.209,1.74,z,.022,.11,.095);
    }
    box('sapphire',s*1.52,2.45,1.46,.052,.54,1.83);
  }
  // 2.45m horizontal clear width; 3.06m vertical clear height.
  box('shade',0,3.49,1.54,2.45,.88,2.54);
  box('coolStone',0,3.07,1.55,2.45,.11,2.52); // soffit visible from below
  for(let z=.59;z<2.73;z+=.24) box('carved',0,3.007,z,2.25,.05,.075);
  box('carved',0,3.15,2.91,3.22,.24,.31);  // face lintel
  box('brass',0,3.32,2.951,3.57,.055,.19);
  box('sapphire',0,3.51,2.925,3.11,.25,.10);
  for(const sx of [-1,1]) {
    latheColumn(sx*1.72,2.82,.83,'carved',3.30);
    // carved capital and beam joint, including real cantilever brackets
    box('carved',sx*1.74,3.37,2.81,.92,.23,.87);
    box('coolStone',sx*1.76,3.18,2.82,.72,.17,.72);
    poly('ice',oct,sx*1.73,3.36,3.31,.18,.23,.13);
  }
  // Recessed amber vestibule; warm light is emissive geometry, not dozens of point lights.
  for(const s of [-1,1]){
    box('amberLow',s*1.26,1.13,.26,.09,1.46,.30);
    box('amber',s*1.20,1.68,.46,.07,.42,.25);
    box('brass',s*1.22,1.99,.46,.12,.078,.30);
    for(const z of [.22,-.58,-1.34]){
      box('carved',s*2.12,2.24,z,.30,.14,.37);
      box('amberLow',s*2.12,2.42,z,.18,.23,.23);
      box('brass',s*2.12,2.56,z,.27,.06,.28);
    }
  }
  // Open paired, thick dark-wood door leaves. Individual planks, brass edge strips and hinges.
  // Leaf pivot at x=±1.20, z=2.50, each swung outward ~75° leaving full passage clear.
  function openDoor(s){
    const hingeX=s*1.18, hingeZ=2.52, angle=s*1.93;
    const p=(u,v,w)=>{
      const t=angle;
      return [hingeX+u*Math.cos(t)+w*Math.sin(t),v,hingeZ-u*Math.sin(t)+w*Math.cos(t)];
    };
    function doorBox(mat,u,y,w,ww,hh,dd) {
      const [x,zz]=p(u,y,w);box(mat,x,y,zz,ww,hh,dd,angle);
    }
    const inward=-s; // from hinge toward center, before swing
    doorBox('door',inward*.50,1.45,0,1.01,2.83,.13);
    for(let k=0;k<4;k++) doorBox(k%2?'door':'oldBrass',inward*(.13+k*.245),1.45,.073,.015,2.65,.025);
    for(const y of [.33,1.42,2.49]) doorBox('brass',inward*.51,y,.083,.95,.055,.03);
    for(const y of [.48,1.31,2.18]){
      const [x,z]=p(inward*.47,y,.125);
      poly('brass',oct,x,y,z,.078,.13,.060,0,angle,0);
    }
    for(const y of [.46,1.46,2.45]) doorBox('brass',.025,y,.102,.12,.13,.19);
    const [x,z]=p(inward*.93,1.48,.18);
    poly('brass',torus,x,1.48,z,.105,.105,.105,0,angle,0);
  }
  openDoor(-1);openDoor(1);

  // ------------ GOPURAM: SIX DIFFERENTIATED TAPERING TIERS ------------
  const levels=[
    [7.36,2.88,1.13],[6.68,2.66,1.04],[6.02,2.45,.97],
    [5.43,2.22,.92],[4.83,2.02,.86],[4.26,1.81,.80]
  ];
  let base=3.82;
  for(let t=0;t<levels.length;t++) {
    const [w,d,h]=levels[t];
    const cx=0,cz=1.56;
    const taper=taperBody(w-.05,d-.06,w-.29,d-.19,h*.88);
    poly(t%2===0?'limestone':'coolStone',taper,cx,base+.08,cz);
    taper.dispose();
    // Dark deep grooves between each hand-carved tier, with actual projecting cornice profiles.
    ringCornice(w,d,base,cz,t%2?'limestone':'coolStone',.23);
    ringCornice(w-.18,d-.15,base+h*.84,cz,'limestone',.24);
    for(let b=0;b<4;b++){
      const theta=b*Math.PI/2;
      const halfW=(b%2===0?w:d)/2;
      const halfD=(b%2===0?d:w)/2;
      const num=b%2===0?3:2;
      const [bx,bz]=faceCoordinates(theta,0,cz,0,halfD-.065);
      // From every direction the tower has recessed bays and their own roof forms.
      for(let j=0;j<num;j++){
        const u=(j-(num-1)/2)*(2*halfW/(num+.35));
        bay(theta,bx,bz,u,base+.19,w/num*.73,h*.48);
      }
      corbelRow(theta,bx,bz,halfW-.07,base+h*.79,1.01-(t*.013));
      frostRail(theta,bx,bz,halfW-.12,base+h+.20);
      for(const sign of [-1,1]){
        steppedMiniature(theta,bx,bz,sign*(halfW-.40),base+h*.96,.64-t*.035);
      }
      // Long horizontal reed with regular blue stone insets.
      faceBox('oldBrass',theta,bx,bz,0,base+h*.145,.13,halfW*1.89,.037,.095);
      for(let c=0;c<3;c++){
        const u=(c-1)*halfW*.60;
        faceBox('iceLip',theta,bx,bz,u,base+h*.73,.08,.16,.075,.065);
      }
    }
    // Corner return blocks wrap adjacent faces and keep the tower solid from diagonal views.
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      box('carved',sx*(w/2-.19),base+h*.45,cz+sz*(d/2-.18),.39,h*.77,.39);
      box('brass',sx*(w/2-.19),base+h*.78,cz+sz*(d/2-.18),.43,.055,.42);
      poly('ice',oct,sx*(w/2-.23),base+h*.90,cz+sz*(d/2-.20),.12,.19,.12);
    }
    base += h;
  }
  // Top crest: square canopy / faceted sapphire crown, not a pasted pyramid.
  ringCornice(3.91,1.73,base-.015,1.56,'coolStone',.23);
  box('sapphire',0,base+.33,1.56,3.13,.45,1.32);
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    poly('ice',oct,sx*1.37,base+.63,1.56+sz*.52,.21,.40,.20);
  }
  const crownProfile=shapePrism([[-1.53,0],[-1.08,.37],[0,.89],[1.08,.37],[1.53,0]],1.29,.018);
  poly('limestone',crownProfile,0,base+.50,.91);
  box('snow',0,base+1.04,1.56,1.14,.07,.92);
  poly('ice',oct,0,base+1.46,1.56,.33,.54,.30);
  poly('brass',cyl8,0,base+1.82,1.56,.16,.12,.16);
  poly('iceLip',oct,0,base+2.03,1.56,.105,.29,.105);

  // ------------ FRONT AND REAR DETAIL: BRAZED LANTERNS / HERITAGE FEATURES ------------
  lantern(-2.61,1.80,3.15,.76);
  lantern( 2.61,1.80,3.15,.76);
  for(const s of [-1,1]){
    for(let y=1.1;y<3.5;y+=.54) box('ice',s*3.58,y,2.94,.10,.17,.085);
    for(const z of [-3.28,-2.30,-1.32,-.34]){
      poly('ice',oct,s*4.15,3.23,z,.10,.16,.10);
    }
  }
  // Original stone-carving family: diamonds, squared spirals, and shallow ribs.
  for(const s of [-1,1]) for(let r=0;r<3;r++){
    const x=s*(2.15+r*.50);
    poly('coolStone',oct,x,2.84,3.012,.13,.17,.055);
    box('oldBrass',x,2.53,3.026,.23,.032,.048);
  }
  for(let r=0;r<7;r++) {
    const x=(r-3)*.39;
    box('brass',x,3.14,3.056,.09,.042,.07);
  }

  // Finalize batched static geometry. Host can add/remove root as one object.
  const stats=B.finalize(root);
  // ------------ SIGN IS REMOVABLE WITHOUT TOUCHING STRUCTURAL GEOMETRY ------------
  const signAnchor=new THREE.Object3D();signAnchor.name='sign';signAnchor.position.set(0,3.43,3.03);
  root.add(signAnchor);
  const SB=baker();
  const signPlaque=new THREE.BoxGeometry(1,1,1);
  SB.add(signPlaque,M.oldBrass,0,0,0,3.49,.32,.112);
  SB.add(signPlaque,M.brass,0,.005,.063,3.33,.242,.028);
  SB.add(signPlaque,M.midnight,0,.009,.089,3.19,.196,.030);
  const GLYPHS={
    C:['01110','10001','10000','10000','10000','10001','01110'],
    H:['10001','10001','10001','11111','10001','10001','10001'],
    A:['01110','10001','10001','11111','10001','10001','10001'],
    T:['11111','00100','00100','00100','00100','00100','00100'],
    U:['10001','10001','10001','10001','10001','10001','01110'],
    R:['11110','10001','10001','11110','10100','10010','10001'],
    N:['10001','11001','10101','10101','10011','10001','10001'],
    G:['01111','10000','10000','10111','10001','10001','01111']
  };
  const letters='CHATURANGA', cell=.0225, spacing=.028, total=letters.length*(5*cell+spacing)-spacing;
  let pen=-total/2;
  for(const ch of letters){
    const grid=GLYPHS[ch];
    for(let r=0;r<7;r++) for(let c=0;c<5;c++) if(grid[r][c]==='1') {
      SB.add(signPlaque,M.carved,pen+c*cell+cell/2,.075-r*cell, .119,cell*.88,cell*.88,.009);
    }
    pen+=5*cell+spacing;
  }
  const signStats=SB.finalize(signAnchor,'sign');
  signAnchor.userData.removable=true;

  // Four attachment anchors: world-space semantic locations in the asset's local frame.
  // The sign anchor owns the sign art so sign.visible=false completely hides it.
  function anchor(name,xyz){const a=new THREE.Object3D();a.name=name;a.position.set(...xyz);root.add(a);return a;}
  const anchors={
    door:anchor('door',[0,0,2.62]),
    sign:signAnchor,
    leftLantern:anchor('leftLantern',[-2.61,1.80,3.15]),
    rightLantern:anchor('rightLantern',[2.61,1.80,3.15])
  };
  const colliders=[
    {name:'gateway-left',center:[-2.44,1.91,1.57],size:[2.16,3.82,2.45]},
    {name:'gateway-right',center:[2.44,1.91,1.57],size:[2.16,3.82,2.45]},
    {name:'hall-left-wall',center:[-4.00,1.91,-1.72],size:[.45,3.82,4.40]},
    {name:'hall-right-wall',center:[4.00,1.91,-1.72],size:[.45,3.82,4.40]},
    {name:'hall-back-wall',center:[0,1.90,-3.78],size:[8.18,3.8,.38]},
    {name:'hall-front-left-wing',center:[-3.25,1.92,.18],size:[1.50,3.84,.34]},
    {name:'hall-front-right-wing',center:[3.25,1.92,.18],size:[1.50,3.84,.34]}
  ];
  // AABBs are intentionally structural only. No roof/ornament collider and no doorway wall.
  root.userData.geometryStats={triangles:stats.triangles+signStats.triangles,
    staticTriangles:stats.triangles,signTriangles:signStats.triangles,
    staticMeshes:stats.meshes,signMeshes:signStats.meshes,
    totalMeshes:stats.meshes+signStats.meshes};
  root.userData.clearOpening={width:2.45,height:3.06};
  return {root,colliders,anchors};
}
