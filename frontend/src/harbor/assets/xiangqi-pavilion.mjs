/**
 * Antarctic Kingdoms / Lantern Harbor — Xiangqi Pavilion exterior (DRAFT)
 * Three.js 0.185.1. Metres, +Y up, entry +Z, local footprint 8.6 x 7.0 m.
 * Original procedural geometry; no external textures, DOM, rendering, lights, or side effects.
 *
 * import { buildXiangqiPavilion } from './xiangqi-pavilion.mjs';
 * const { root, colliders, anchors } = buildXiangqiPavilion(THREE);
 */
export function buildXiangqiPavilion(THREE) {
  const root = new THREE.Group();
  root.name = 'XiangqiPavilion_DRAFT';
  root.userData = { draft: true, asset: 'xiangqi-pavilion', units: 'metres',
    entrance: '+Z', footprint: [8.6,7.0], finishedFloorY: 0,
    verandaDeckY: 0, terrainLevelY: -0.55, threeRevisionTarget: '0.185.1' };
  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: 0x74818b, roughness: .82 }),
    ice: new THREE.MeshStandardMaterial({ color: 0x0e5d90, metalness: .28, roughness: .34 }),
    iceRim: new THREE.MeshStandardMaterial({ color: 0x8dcbd8, metalness: .16, roughness: .37 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x23272a, roughness: .78 }),
    red: new THREE.MeshStandardMaterial({ color: 0x982630, roughness: .43 }),
    vermilion: new THREE.MeshStandardMaterial({ color: 0xc45443, roughness: .5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xa88d4e, metalness: .60, roughness: .36 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x154a56, metalness: .12, roughness: .57, side: THREE.DoubleSide }),
    tileA: new THREE.MeshStandardMaterial({ color: 0x1c5c67, metalness: .20, roughness: .42, side: THREE.DoubleSide }),
    tileB: new THREE.MeshStandardMaterial({ color: 0x154b58, metalness: .18, roughness: .48, side: THREE.DoubleSide }),
    snow: new THREE.MeshStandardMaterial({ color: 0xe0f0f5, metalness: 0, roughness: .85, side: THREE.DoubleSide }),
    glass: new THREE.MeshBasicMaterial({ color: 0xffb75b, side: THREE.DoubleSide }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb651, emissive: 0xd27423, emissiveIntensity: 1.05, roughness: .41 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x80503b, emissive: 0x50220e, emissiveIntensity: .27, roughness: .87 }),
  };

  // One static indexed BufferGeometry per material, assembled from reusable source profiles.
  // Repeated roof tiles, brackets, rafters and lattice bars are baked into draw-call-efficient batches.
  const buffers = new Map();
  for (const key of Object.keys(materials)) buffers.set(key, { p:[], n:[], ix:[], vertices:0, triangles:0 });
  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const cylGeo = new THREE.CylinderGeometry(1,1,1,14,1);
  const rodGeo = new THREE.CylinderGeometry(1,1,1,8,1);
  const lanternGeo = new THREE.SphereGeometry(1,14,10);
  const torusGeo = new THREE.TorusGeometry(1,.08,6,24);
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3();
  const Y = new THREE.Vector3(0,1,0);

  function submit(g, key, p=[0,0,0], q=null, s=[1,1,1]) {
    const b = buffers.get(key);
    if (!b) throw new Error('Unknown material: '+key);
    _v.set(...p); _s.set(...s);
    _m.compose(_v, q || new THREE.Quaternion(), _s);
    _nm.getNormalMatrix(_m);
    const position = g.getAttribute('position');
    const normals = g.getAttribute('normal');
    const idx = g.getIndex();
    const start = b.vertices;
    const P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i=0; i<position.count; i++) {
      P.fromBufferAttribute(position,i).applyMatrix4(_m);
      b.p.push(P.x,P.y,P.z);
      if (normals) N.fromBufferAttribute(normals,i).applyMatrix3(_nm).normalize();
      else N.set(0,1,0);
      b.n.push(N.x,N.y,N.z);
    }
    if (idx) { for (let i=0;i<idx.count;i++) b.ix.push(start + idx.getX(i)); b.triangles += idx.count/3; }
    else { for(let i=0;i<position.count;i++) b.ix.push(start+i); b.triangles+=position.count/3; }
    b.vertices += position.count;
  }
  function block(key,x,y,z,w,h,d) { submit(boxGeo,key,[x,y,z],null,[w,h,d]); }
  function cyl(key,x,y,z,r1,ht,r2=r1) {
    // Cylinders use a reusable unit profile for normal shafts, and custom tapered profile for caps.
    if (Math.abs(r1-r2)<1e-7) submit(cylGeo,key,[x,y,z],null,[r1,ht,r1]);
    else submit(new THREE.CylinderGeometry(r1,r2,ht,14,1),key,[x,y,z]);
  }
  function beam(key,a,b,width,height=width) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va), len = dir.length();
    const mid = va.add(vb).multiplyScalar(.5);
    const qt = new THREE.Quaternion().setFromUnitVectors(Y,dir.normalize());
    submit(boxGeo,key,mid.toArray(),qt,[width,len,height]);
  }
  function roundBeam(key,a,b,radius=.03) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va), len=dir.length(), mid=va.add(vb).multiplyScalar(.5);
    const qt = new THREE.Quaternion().setFromUnitVectors(Y,dir.normalize());
    submit(rodGeo,key,mid.toArray(),qt,[radius,len,radius]);
  }
  function surface(key, nx, nz, fn, reverse=false) {
    const verts=[], faces=[];
    for(let i=0;i<=nx;i++) for(let j=0;j<=nz;j++) verts.push(...fn(i/nx,j/nz));
    for(let i=0;i<nx;i++) for(let j=0;j<nz;j++) {
      const a=i*(nz+1)+j, b=a+nz+1, c=a+1, d=b+1;
      if(!reverse) faces.push(a,c,b,c,d,b); else faces.push(a,b,c,c,b,d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setIndex(faces);g.computeVertexNormals(); submit(g,key);g.dispose();
  }
  // A deliberately non-linear eave-to-ridge section. The same function drives roof,
  // actual ceramic tile vertices, snow, edge boards and underside joinery.
  const roofY=(x,z)=>{
    const u=Math.min(1,Math.abs(x)/4.04), v=Math.min(1,Math.abs(z)/3.25);
    return 2.92 + 1.51*(1-Math.sin(Math.PI*u*.5))
      + .39*Math.pow(u,5)*Math.pow(v,5) + .15*Math.pow(v,8);
  };
  const deck = .55;

  // Faceted sapphire-ice substructure with actual exposed blue edges, not alpha planes.
  block('stone',0,.095,-.39,8.56,.19,6.18);  // apron z -3.48..2.70
  block('ice',0,.312,-.38,8.43,.38,6.09);
  block('stone',0,.522,-.38,8.37,.075,6.06);
  // Facet planes on the four ice sides.
  for(let i=0;i<18;i++) {
    const x=-4.08+i*.48;
    block('iceRim',x,.325,2.665,.022,.22,.018);
    block('iceRim',x,.325,-3.43,.022,.22,.018);
  }
  for(let j=0;j<13;j++) for(const sx of [-1,1])
    block('iceRim',sx*4.213,.31,-3.21+j*.48,.018,.2,.025);
  block('iceRim',0,.556,2.62,8.40,.037,.075);
  block('iceRim',0,.556,-3.37,8.40,.037,.075);
  for(const side of [-1,1]) block('iceRim',side*4.17,.556,-.35,.075,.035,6.0);
  // Three real ascending treads and their side cheeks. Approach x=-1.22...1.22 remains clear.
  const stair = [ [3.33,.18],[3.07,.36],[2.81,.54] ];
  for(let i=0;i<stair.length;i++){
    const [z,h]=stair[i];
    block('stone',0,h/2,z,2.56,h,.285);
    block('iceRim',0,h,z+.136,2.58,.035,.036);
  }
  for(const sx of [-1,1]) {
    block('ice',sx*1.32,.24,3.11,.17,.39,.75);
    block('brass',sx*1.32,.45,3.11,.19,.05,.77);
  }
  // Raised charcoal boards around the three open-sided verandas.
  for(const x of [-3.07,-2.51,-1.96,-1.40,-.84,-.28,.28,.84,1.40,1.96,2.51,3.07])
    block('timber',x,.577,-.34,.025,.020,5.95);

  // Pavilion core: framed walls, inset amber interior and a genuinely open front portal.
  // Front exterior is at z 1.87, back is -1.84: the door is a recess, not a flat painted slab.
  for(const sx of [-1,1]) {
    // Open rectangular window void, enclosed by four real stone reveals.
    block('stone',sx*1.78,.85,1.85,1.55,.59,.20);
    block('stone',sx*1.78,2.395,1.85,1.55,.23,.20);
    block('stone',sx*(1.78-.645),1.72,1.85,.26,1.12,.20);
    block('stone',sx*(1.78+.645),1.72,1.85,.26,1.12,.20);
    block('red',sx*2.57,1.54,0,.18,2.01,3.98);
    // Side apertures at z=+-0.9. Distinct sill, header and piers remain modeled.
    block('stone',sx*2.54,.845,0,.12,.57,3.60);
    block('stone',sx*2.54,2.38,0,.12,.26,3.60);
    for(const [zz,len] of [[-1.62,.32],[-.03,.79],[1.57,.46]])
      block('stone',sx*2.54,1.695,zz,.12,1.13,len);
  }
  block('stone',0,2.53,1.85,5.24,.36,.22);
  block('timber',0,2.81,1.84,5.55,.14,.23);
  for(const sx of [-1,1]) {
    block('timber',sx*.94,1.48,1.89,.12,1.99,.26);  // deep door jamb
    block('brass',sx*.83,1.50,1.91,.030,1.86,.028);
    block('timber',sx*.50,2.43,1.91,.90,.11,.26);
  }
  block('stone',0,.57,1.71,1.64,.09,.58); // threshold to recessed portal
  block('brass',0,.629,1.97,1.52,.022,.034);
  // Inner chamber warmly lit by material, not expensive mandatory point lights.
  block('interior',0,1.65,.46,4.55,1.58,.09);
  block('interior',0,.605,.10,4.66,.055,3.00);
  block('timber',0,2.43,.30,4.78,.08,3.06);
  block('glass',0,1.57,.403,1.34,1.48,.016); // far room visible through open doorway
  for(let i=0;i<4;i++) block('timber',-.55+i*.36,1.57,.43,.035,1.37,.038);
  // Side faces receive real inset bays, not missing rear/side walls.
  for(const side of [-1,1]) {
    block('timber',side*2.63,2.59,0,.16,.14,3.84);
    block('red',side*2.62,.84,0,.13,.50,3.75);
  }
  // Rear room face, partly screened; rear veranda is a sheltered open overlook.
  for(const side of [-1,1]) {
    block('stone',side*1.80,.85,-1.84,1.54,.59,.17);
    block('stone',side*1.80,2.395,-1.84,1.54,.23,.17);
    for(const dx of [-.65,.65])block('stone',side*1.80+dx,1.72,-1.84,.26,1.12,.17);
  }
  block('timber',0,2.55,-1.84,5.22,.15,.16);
  block('interior',0,1.53,-1.91,1.90,1.61,.04);
  // Rear center open viewing slot: screen leaves a strong horizontal viewing aperture.
  block('timber',0,.87,-1.96,1.78,.41,.13);
  block('timber',0,2.43,-1.96,1.82,.21,.15);

  // Lattice bays: warm back-face at depth, black-brown screen physically projected outward.
  function frontLattice(x,z,width=1.00,height=1.12,face=1) {
    const yc=1.72, frameZ=z+.09*face, backZ=z-.048*face;
    block('glass',x,yc,backZ,width-.12,height-.12,.018);
    for(const sx of [-1,1]) block('timber',x+sx*width*.48,yc,frameZ,.07,height,.075);
    for(const sy of [-1,1]) block('timber',x,yc+sy*height*.48,frameZ,width,.075,.075);
    // Screen bars sit ahead of the luminous aperture.
    for(let k=-2;k<=2;k++) {
      const xx=x+k*(width-.16)/5;
      block('timber',xx,yc,frameZ+face*.066,.041,height-.09,.058);
    }
    for(let k=-2;k<=2;k++) {
      const yy=yc+k*(height-.12)/5;
      block('timber',x,yy,frameZ+face*.068,width-.07,.037,.061);
    }
    for(const sx of [-1,1]) block('brass',x+sx*width*.48,yc,frameZ+face*.072,.023,height+.04,.024);
    for(const sy of [-1,1]) block('brass',x,yc+sy*height*.49,frameZ+face*.073,width+.04,.020,.022);
  }
  for(const side of [-1,1]) {
    frontLattice(side*1.78,1.974,.99,1.12);
    frontLattice(side*1.79,-1.84,1.02,1.10,-1); // rear-facing real screen
  }
  function sideLattice(x,z) {
    const yc=1.69, width=1.02,height=1.13, side=Math.sign(x);
    block('glass',x-side*.06,yc,z,.018,height-.13,width-.13);
    for(const sz of [-1,1]) block('timber',x+side*.07,yc,z+sz*width*.48,.075,height,.070);
    for(const sy of [-1,1]) block('timber',x+side*.07,yc+sy*height*.48,z,.075,.072,width);
    for(let k=-2;k<=2;k++) {
      block('timber',x+side*.128,yc,z+k*.17,.045,height-.10,.032);
      block('timber',x+side*.13,yc+k*.17,z,.045,.034,width-.11);
    }
    for(const zz of [-.49,.49]) block('brass',x+side*.15,yc,z+zz,.032,height+.06,.026);
  }
  for(const side of [-1,1]) for(const z of [-.92,.87]) sideLattice(side*2.665,z);

  // Real red lacquer columns (not painted stripes). Bases/capitals and timber-to-beam joins.
  const columns = [];
  const instancedShaftTransforms = [];
  for(const z of [-2.72,2.34]) for(const x of [-3.42,-1.67,1.67,3.42]) columns.push([x,z]);
  for(const side of [-1,1]) for(const z of [-1.17,.87]) columns.push([side*3.42,z]);
  for(const [x,z] of columns) {
    cyl('stone',x,.61,z,.237,.125);
    cyl('brass',x,.704,z,.19,.085);
    instancedShaftTransforms.push([x,1.69,z]); // instance one reusable shaft profile
    cyl('brass',x,2.673,z,.171,.085);
    block('timber',x,2.742,z,.49,.145,.50);
    block('brass',x,2.825,z,.56,.036,.56);
  }
  // Open railings leave a completely clear front-center stair axis.
  for(const z of [2.36,-2.72]) {
    for(const side of [-1,1]) {
      const x=side*2.56;
      block('timber',x,.995,z,1.13,.075,.10);
      block('brass',x,1.042,z,1.15,.026,.114);
      for(const xx of [1.99,2.49,3.02]) block('red',side*xx,.82,z,.055,.42,.060);
    }
  }
  for(const side of [-1,1]) {
    for(const z of [-2.1,-.61,1.62]) {
      block('timber',side*3.42,.982,z,.105,.073,1.13);
      block('brass',side*3.42,1.03,z,.12,.018,1.15);
      for(const zz of [-.45,0,.45]) block('red',side*3.42,.82,z+zz,.061,.44,.057);
    }
  }
  // Sheltered mountain-facing viewing bay: open back with side benches and low scenic balustrade.
  for(const side of [-1,1]) {
    block('timber',side*2.10,.91,-2.49,.95,.13,.38);
    block('red',side*2.10,.73,-2.49,.80,.22,.30);
    block('brass',side*2.10,.991,-2.49,.91,.026,.35);
  }
  block('timber',0,.92,-2.94,1.70,.09,.10);
  block('brass',0,.98,-2.94,1.71,.024,.12);
  for(const x of [-.78,-.39,0,.39,.78]) block('red',x,.75,-2.94,.055,.32,.055);

  // True 2-axis curved roof shell with corners physically raised in its vertex positions.
  const w=4.04, d=3.25;
  surface('roof',56,30,(u,v)=>{
    const x=-w+2*w*u,z=-d+2*d*v;
    return [x,roofY(x,z),z];
  });
  surface('timber',56,30,(u,v)=>{
    const x=-w+2*w*u,z=-d+2*d*v;
    return [x,roofY(x,z)-.185,z];
  },true);
  // Perimeter fascia makes the shell thickness apparent from a pedestrian's camera.
  surface('timber',56,1,(u,v)=>{
    const x=-w+2*w*u,z=-d;
    return [x,roofY(x,z)-.196+v*.193,z];
  },true);
  surface('timber',56,1,(u,v)=>{
    const x=-w+2*w*u,z=d;
    return [x,roofY(x,z)-.196+v*.193,z];
  });
  for(const sx of [-1,1]) surface('timber',28,1,(u,v)=>{
    const z=-d+2*d*u,x=sx*w;
    return [x,roofY(x,z)-.195+v*.19,z];
  },sx>0);

  // Curved overlapping terracotta-like ceramic strips as actual geometry (not a texture).
  // Tiles follow the exact roof function; barrel profiles cast real highlights and seams.
  const cols=34, rows=22;
  for(let c=0;c<cols;c++) for(let r=0;r<rows;r++) {
    const xa=-3.94+c*(7.88/cols),xb=-3.94+(c+1)*(7.88/cols);
    const za=-3.135+r*(6.27/rows),zb=-3.135+(r+1)*(6.27/rows);
    const tileKey=((c+r)%4===0)?'tileB':'tileA';
    surface(tileKey,3,2,(u,v)=>{
      const x=xa+(xb-xa)*u,z=za+(zb-za)*v;
      const barrel=.040*Math.sin(Math.PI*u);
      const overlap=.017*(1-v)*(1-v);
      return [x,roofY(x,z)+.016+barrel+overlap,z];
    });
  }
  // Roof ridges: three-dimensional raised cap tiles and decorative brass lines.
  for(let j=0;j<26;j++){
    const z=-3.12+j*.246;
    submit(cylGeo,'roof',[0,roofY(0,z)+.064,z],
      new THREE.Quaternion().setFromUnitVectors(Y,new THREE.Vector3(0,0,1)), [.145,.257,.145]);
    if(j%2===0) roundBeam('brass',[-.16,roofY(0,z)+.084,z],[.16,roofY(0,z)+.084,z],.022);
  }
  // Curved ridge end finials and lightly upturned corner rib profiles.
  for(const sz of [-1,1]) {
    cyl('brass',0,roofY(0,sz*3.22)+.21,sz*3.22,.075,.26);
    submit(lanternGeo,'brass',[0,roofY(0,sz*3.22)+.37,sz*3.22],null,[.15,.12,.15]);
  }
  // Eave perimeter includes follow-the-curve wood lip and an inset gold thread.
  for(const sz of [-1,1]) for(let k=0;k<40;k++) {
    const a=-4.04+k*(8.08/40),b=-4.04+(k+1)*(8.08/40);
    const z=sz*3.25;
    beam('timber',[a,roofY(a,z)-.18,z],[b,roofY(b,z)-.18,z],.12,.11);
    roundBeam('brass',[a,roofY(a,z)-.115,z+sz*.02],[b,roofY(b,z)-.115,z+sz*.02],.018);
  }
  for(const sx of [-1,1]) for(let k=0;k<26;k++) {
    const a=-3.25+k*(6.5/26),b=-3.25+(k+1)*(6.5/26);
    beam('timber',[sx*4.04,roofY(sx*4.04,a)-.17,a],[sx*4.04,roofY(sx*4.04,b)-.17,b],.12,.12);
  }
  // Rafters are visible on underside around the open veranda and through the sides.
  for(let k=0;k<10;k++) {
    const z=-2.91+k*(5.82/9);
    for(let t=0;t<18;t++) {
      const xa=-3.92+t*(7.84/18),xb=-3.92+(t+1)*(7.84/18);
      beam('timber',[xa,roofY(xa,z)-.238,z],[xb,roofY(xb,z)-.238,z],.078,.095);
    }
  }
  // Horizontal purlins suspended beneath the shell follow its subtly raised front/back tips.
  for(const x of [-3.25,-2.10,-.95,.95,2.10,3.25]) for(let k=0;k<16;k++) {
    const za=-3.14+k*(6.28/16),zb=-3.14+(k+1)*(6.28/16);
    beam('red',[x,roofY(x,za)-.27,za],[x,roofY(x,zb)-.27,zb],.075,.10);
  }
  // Layered dougong-inspired brackets connect every exterior column to projecting eaves.
  for(const [x,z] of columns) {
    block('red',x,2.90,z,.42,.12,.58);
    block('timber',x,2.988,z,.71,.12,.39);
    block('vermilion',x,3.071,z,.91,.080,.32);
    for(const side of [-1,1]) {
      block('brass',x+side*.35,3.124,z,.065,.09,.31);
      block('red',x+side*.39,3.19,z,.13,.11,.30);
    }
    // Curved, stepped cantilever projected toward outer edge of veranda.
    const xside=Math.sign(x)||1;
    beam('timber',[x,3.03,z],[x+xside*.52,3.14,z],.13,.17);
  }
  // Drifts hug the curved ridgeline, rear valley and windward tile rows, preserving exposed tile.
  for(const sx of [-1,1]) for(let region=0;region<3;region++) {
    const xa=sx>0? [.12,2.67,3.69][region] : [-.72,-3.36,-3.96][region];
    const xb=sx>0? [.70,3.36,3.96][region] : [-.12,-2.67,-3.69][region];
    const zRanges = region===0 ? [[-3.08,-1.55],[-.85,.47],[1.15,3.08]]
      : region===1 ? [[-3.03,-2.25],[.64,1.45]] : [[-3.10,-2.67],[2.65,3.09]];
    for(const [za,zb] of zRanges) surface('snow',8,10,(u,v)=>{
      const wobble=(.045*Math.sin(12.0*v+region*1.8)+.021*Math.cos(19*u+6*v));
      const x=xa+(xb-xa)*u+wobble*Math.sin(Math.PI*u),z=za+(zb-za)*v;
      const edge=.5-.5*Math.cos(2*Math.PI*u);
      return [x,roofY(x,z)+.085+.028*edge+.016*Math.cos(v*13+u*8),z];
    });
  }
  // Small snow tongues at the four raised corners, deliberately open enough to reveal the curl.
  for(const sx of [-1,1]) for(const sz of [-1,1]) surface('snow',5,6,(u,v)=>{
    const x=sx*(3.36+.53*u),z=sz*(2.58+.45*v);
    return [x,roofY(x,z)+.075+.027*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),z];
  });

  // Lanterns physically hang beneath the front eave, emit warm color without point lights.
  function lantern(x,z) {
    const hook=roofY(x,z)-.34;
    roundBeam('brass',[x,hook,z],[x,2.41,z],.028);
    cyl('brass',x,2.384,z,.13,.072);
    submit(lanternGeo,'amber',[x,2.15,z],null,[.225,.267,.222]);
    cyl('brass',x,1.913,z,.12,.065);
    cyl('red',x,1.816,z,.031,.16);
    for(let k=0;k<6;k++) {
      const a=k*Math.PI*2/6;
      const xx=x+Math.sin(a)*.209,zz=z+Math.cos(a)*.209;
      roundBeam('brass',[xx,2.31,zz],[xx,1.98,zz],.010);
    }
    // Equatorial band and top/bottom caps are real geometry.
    submit(torusGeo,'brass',[x,2.15,z],new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2),[.218,.218,.218]);
  }
  lantern(-1.75,2.66); lantern(1.75,2.66);

  // Collapse the large repeated roof/window/wood detail into one indexed mesh per material.
  const geometryStats = {};
  for(const [key,b] of buffers) {
    if(!b.ix.length) continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    g.setIndex(b.ix);
    g.computeBoundingBox();g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,materials[key]); mesh.name='Batch_'+key;
    mesh.castShadow = key!=='glass' && key!=='amber'; mesh.receiveShadow=true;
    root.add(mesh);
    geometryStats[key]={ vertices:b.vertices, triangles:b.ix.length/3 };
  }
  // Red columns also use actual GPU instancing: one cylinder buffer + twelve matrices.
  const columnShafts=new THREE.InstancedMesh(cylGeo,materials.red,instancedShaftTransforms.length);
  columnShafts.name='Instanced_Lacquer_Columns';
  const instancingDummy=new THREE.Object3D();
  for(let i=0;i<instancedShaftTransforms.length;i++){
    instancingDummy.position.set(...instancedShaftTransforms[i]);
    instancingDummy.scale.set(.147,1.95,.147);
    instancingDummy.updateMatrix();
    columnShafts.setMatrixAt(i,instancingDummy.matrix);
  }
  columnShafts.instanceMatrix.needsUpdate=true;
  columnShafts.castShadow=true; columnShafts.receiveShadow=true;
  columnShafts.computeBoundingSphere();
  root.add(columnShafts);
  const instancedTriangles=(cylGeo.getIndex().count/3)*instancedShaftTransforms.length;
  geometryStats.instancedColumns={ triangles:instancedTriangles,
    vertices:cylGeo.getAttribute('position').count, instances:instancedShaftTransforms.length, drawCalls:1 };

  const anchors={};
  const anchor=(name,pos)=>{
    const a=new THREE.Object3D(); a.name='anchor_'+name; a.position.set(...pos);
    root.add(a); anchors[name]=a; return a;
  };
  anchor('door',[0,deck,2.01]);
  anchor('leftLantern',[-1.75,2.15,2.66]);
  anchor('rightLantern',[1.75,2.15,2.66]);
  const sign = anchor('sign',[0,2.55,2.57]);
  // Sign is the only deliberately separate removable assembly.
  const signFrame=new THREE.Mesh(new THREE.BoxGeometry(2.05,.50,.12),materials.brass);
  sign.add(signFrame);
  const signFace=new THREE.Mesh(new THREE.BoxGeometry(1.96,.41,.134),materials.timber);
  signFace.position.z=.015; sign.add(signFace);
  signFrame.castShadow=true;signFace.castShadow=true;
  const glyphs={
    X:[[0,0],[.55,1],null,[0,1],[.55,0]],
    I:[[0,1],[.55,1],null,[.275,1],[.275,0],null,[0,0],[.55,0]],
    A:[[0,0],[.29,1],[.58,0],null,[.12,.38],[.46,.38]],
    N:[[0,0],[0,1],[.58,0],[.58,1]],
    G:[[.57,.84],[.36,1],[.12,.90],[0,.65],[0,.22],[.20,0],[.55,.08],[.55,.48],[.33,.48]],
    Q:[[.45,.05],[.18,0],[0,.26],[0,.75],[.18,1],[.46,.96],[.60,.71],[.60,.24],[.45,.05],null,[.36,.25],[.64,-.12]]
  };
  const word='XIANGQI', width=.183, gap=.064, total=word.length*(width+gap)-gap;
  // The entire seven-letter word is one merged mesh, preserving the draw-call budget.
  const letterP=[], letterN=[],letterI=[];
  const rodPos=rodGeo.getAttribute('position'),rodNorm=rodGeo.getAttribute('normal'),rodIndex=rodGeo.getIndex();
  let letterVertices=0;
  function addLetterStroke(a,b){
    const delta=b.clone().sub(a),len=delta.length();
    const q=new THREE.Quaternion().setFromUnitVectors(Y,delta.normalize());
    const middle=a.add(b).multiplyScalar(.5);
    const transform=new THREE.Matrix4().compose(middle,q,new THREE.Vector3(.008,len,.008));
    const normalTransform=new THREE.Matrix3().getNormalMatrix(transform);
    const vv=new THREE.Vector3(),nn=new THREE.Vector3();
    for(let j=0;j<rodPos.count;j++){
      vv.fromBufferAttribute(rodPos,j).applyMatrix4(transform);
      nn.fromBufferAttribute(rodNorm,j).applyMatrix3(normalTransform).normalize();
      letterP.push(vv.x,vv.y,vv.z);letterN.push(nn.x,nn.y,nn.z);
    }
    for(let j=0;j<rodIndex.count;j++)letterI.push(letterVertices+rodIndex.getX(j));
    letterVertices+=rodPos.count;
  }
  function strokes(ch,startX){
    const p=glyphs[ch];let current=null;
    for(const pt of p){
      if(pt===null){current=null;continue;}
      if(current){
        const a=new THREE.Vector3(startX+current[0]*width/.64,-.117+current[1]*.24,.108);
        const b=new THREE.Vector3(startX+pt[0]*width/.64,-.117+pt[1]*.24,.108);
        addLetterStroke(a,b);
      }
      current=pt;
    }
  }
  for(let i=0;i<word.length;i++) strokes(word[i],-total/2+i*(width+gap));
  const letterG=new THREE.BufferGeometry();
  letterG.setAttribute('position',new THREE.Float32BufferAttribute(letterP,3));
  letterG.setAttribute('normal',new THREE.Float32BufferAttribute(letterN,3));
  letterG.setIndex(letterI);
  const textMesh=new THREE.Mesh(letterG,materials.brass);textMesh.name='Raised_XIANGQI_Glyphs';
  sign.add(textMesh);
  sign.userData={ removable:true, hint:'anchors.sign.visible = false', text:'XIANGQI' };

  // Solid obstacles only: no enclosing roof-volume blockers, no collider across the front doorway.
  const colliders=[];
  const hit=(name,center,size)=>colliders.push({ name,center,size });
  hit('front-left-wall',[-1.78,1.53,1.85],[1.55,1.94,.20]);
  hit('front-right-wall',[1.78,1.53,1.85],[1.55,1.94,.20]);
  hit('left-core-wall',[-2.61,1.53,0],[.23,1.93,3.86]);
  hit('right-core-wall',[2.61,1.53,0],[.23,1.93,3.86]);
  hit('rear-left-wall',[-1.80,1.53,-1.84],[1.54,1.92,.19]);
  hit('rear-right-wall',[1.80,1.53,-1.84],[1.54,1.92,.19]);
  hit('rear-center-sill',[0,.86,-1.96],[1.78,.42,.15]);
  for(let i=0;i<columns.length;i++){
    const [x,z]=columns[i];hit('column-'+(i+1),[x,1.70,z],[.36,2.22,.36]);
  }
  for(const z of [2.36,-2.72])for(const side of [-1,1])
    hit('front-rear-rail-'+z+'-'+side,[side*2.56,.86,z],[1.18,.49,.14]);
  for(const side of [-1,1]) for(const z of [-2.1,-.61,1.62])
    hit('side-rail-'+side+'-'+z,[side*3.42,.85,z],[.15,.49,1.16]);
  hit('rear-view-rail',[0,.85,-2.94],[1.73,.37,.13]);
  // Geometry counts computed from indexed GPU-ready buffers, including the removable sign.
  let tris=0,drawGroups=0,vertexCount=0;
  for(const b of Object.values(geometryStats)) { tris+=b.triangles;vertexCount+=b.vertices;drawGroups++; }
  const signTriangles=24+letterI.length/3;
  root.userData.geometryStats={ staticBatches:drawGroups, staticTriangles:tris,
    staticVertices:vertexCount, instancedColumnCount:instancedShaftTransforms.length,
    signTriangles, signDrawCalls:3,
    completeTriangles:tris+signTriangles, completeDrawCalls:drawGroups+3,
    byMaterial:geometryStats,
    signNote:'removable sign has 3 draw calls (frame, board, merged raised glyphs)' };
  // Transform geometry, colliders and anchors into integration space:
  // hall/veranda finished floor = 0; surrounding snow/terrain = -0.55.
  // Root stays at local identity, ready for host placement without compensation.
  for(const child of root.children) child.position.y -= deck;
  for(const c of colliders) c.center[1] -= deck;
  return { root, colliders, anchors };
}
