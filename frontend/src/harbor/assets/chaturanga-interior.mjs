/**
 * Antarctic Kingdoms — Walkable Chaturanga Temple Interior, DRAFT v0.1
 * Three.js 0.185.1. No asset downloads, no renderer, UI or global listeners.
 * Units: metres. Floor y=0. Entry on +Z. Front/arrival faces -Z.
 * Original procedural geometry and materials; no third-party texture assets.
 */

export function buildChaturangaInterior(THREE) {
  if (!THREE?.Group || !THREE?.BufferGeometry || !THREE?.InstancedMesh) {
    throw new Error('Pass the Three.js 0.185.1 namespace to buildChaturangaInterior(THREE).');
  }

  const root = new THREE.Group();
  root.name = 'ChaturangaInterior_DRAFT';
  const main = new THREE.Group(); main.name = 'architectureAndFixtures'; root.add(main);
  const cameraFacingWalls = new THREE.Group();
  cameraFacingWalls.name = 'cameraFacingWalls'; root.add(cameraFacingWalls);
  const cameraFacingCeiling = new THREE.Group();
  cameraFacingCeiling.name = 'cameraFacingCeiling'; root.add(cameraFacingCeiling);
  const anchors = {};
  const anchor = (name,x,y,z,rotationY=0) => {
    const obj=new THREE.Object3D();obj.name=name;obj.position.set(x,y,z);obj.rotation.y=rotationY;
    root.add(obj);anchors[name]=obj;return obj;
  };
  anchor('entry',0,0,5.8,0); // Three.js -Z forward: arrival facing north
  anchor('exit',0,0,7.65,Math.PI); // departure heading toward +Z
  anchor('gameTable',0,0,-0.7,0);
  anchor('heritagePedestal',-3.55,0,-0.8,Math.PI/2);
  anchor('tutorial',3.55,0,-0.8,-Math.PI/2);

  const materials = {
    stone: new THREE.MeshStandardMaterial({color:0xd7e0de,roughness:0.86,metalness:0.02}),
    shade: new THREE.MeshStandardMaterial({color:0x738aa1,roughness:0.79,metalness:0.04}),
    ice: new THREE.MeshStandardMaterial({color:0x12528d,roughness:0.3,metalness:0.14}),
    iceEdge: new THREE.MeshStandardMaterial({color:0x69b7db,roughness:0.29,metalness:0.07}),
    brass: new THREE.MeshStandardMaterial({color:0xc99a52,roughness:0.31,metalness:0.76}),
    ink: new THREE.MeshStandardMaterial({color:0x122840,roughness:0.62,metalness:0.07}),
    amber: new THREE.MeshBasicMaterial({color:0xffb35d}),
    blueGlow: new THREE.MeshBasicMaterial({color:0x8adaf3}),
    painted: new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:0.42,metalness:0.14})
  };
  // The geometry batcher deliberately joins hundreds of independent original
  // carvings into a handful of material-specific draw calls. Normals are baked;
  // batch contents are non-interactive decoration, not collision primitives.
  class GeometryBatch {
    constructor(parent) {this.parent=parent;this.map=new Map();}
    add(mat,geo,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1],tint=null) {
      if(!this.map.has(mat))this.map.set(mat,[]);
      const m=new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
        new THREE.Vector3(...scale)
      );
      this.map.get(mat).push({geo,m,tint});
    }
    finish() {
      for(const [name,items] of this.map) {
        const positions=[],normals=[],colors=[]; let triangleCount=0;
        for(const {geo,m,tint} of items) {
          const g=geo.index?geo.toNonIndexed():geo.clone();
          g.applyMatrix4(m);
          if(!g.getAttribute('normal')) g.computeVertexNormals();
          const a=g.getAttribute('position'),n=g.getAttribute('normal');
          const count=a.count;
          const color=tint?new THREE.Color(tint):null;
          for(let i=0;i<count;i++) {
            positions.push(a.getX(i),a.getY(i),a.getZ(i));
            normals.push(n.getX(i),n.getY(i),n.getZ(i));
            if(name==='painted')colors.push(color?.r??1,color?.g??1,color?.b??1);
          }
          triangleCount+=count/3;
          g.dispose();
        }
        const merged=new THREE.BufferGeometry();
        merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
        if(name==='painted') merged.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
        merged.computeBoundingSphere();
        const mesh=new THREE.Mesh(merged,materials[name]);
        mesh.name=`batched_${name}`;mesh.castShadow=name!=='amber'&&name!=='blueGlow';
        mesh.receiveShadow=true;
        mesh.userData.triangles=triangleCount;
        this.parent.add(mesh);
      }
      this.map.clear();
    }
  }
  const body=new GeometryBatch(main);
  const south=new GeometryBatch(cameraFacingWalls);
  const crown=new GeometryBatch(cameraFacingCeiling);

  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const cylinder=(rt,rb,h,segments=12)=>new THREE.CylinderGeometry(rt,rb,h,segments);
  const sphere=(r,segments=12,rings=8)=>new THREE.SphereGeometry(r,segments,rings);
  const torus=(r,tub,radial=6,tubular=32)=>new THREE.TorusGeometry(r,tub,radial,tubular);
  const strip=(b,mat,w,h,d,x,y,z,ry=0)=>b.add(mat,box(w,h,d),[x,y,z],[0,ry,0]);
  // Planar bevelled, chamfer-cornered slab. Shape drawn X by Z; +Y thickness.
  const chamfer=(w,d,c,h,bevel=0.02)=>{
    const p=new THREE.Shape();const x=w/2,z=d/2;
    p.moveTo(-x+c,-z);p.lineTo(x-c,-z);p.lineTo(x,-z+c);
    p.lineTo(x,z-c);p.lineTo(x-c,z);p.lineTo(-x+c,z);
    p.lineTo(-x,z-c);p.lineTo(-x,-z+c);p.closePath();
    const g=new THREE.ExtrudeGeometry(p,{depth:h,bevelEnabled:bevel>0,
      steps:1,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:2});
    g.rotateX(-Math.PI/2);
    // Extrusion extends upward in world; front face is at y=0.
    return g;
  };
  // A shallow wedge whose sloping surface is physically modelled; one low ramp
  // on each dais side makes the platform visually and practically approachable.
  const ramp=(width,length,height)=>{
    const s=new THREE.Shape();s.moveTo(-length/2,0);s.lineTo(length/2,height);
    s.lineTo(length/2,0);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:false,steps:1});
    // current local XY: gradient -length/2=>+length/2, extrusion along Z
    g.translate(0,0,-width/2);return g;
  };
  const lathe=(pts,steps=24)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),steps);
  const disc=(radius,thickness,segments=24)=>cylinder(radius,radius,thickness,segments);

  // A south Indian temple-inspired torana band with real carved thickness.
  // Shape forms a segmented pointed ogee/arch above a clear opening.
  function archBand(span,spring,rise,band,depth,segments=24){
    const path=new THREE.Shape(),half=span/2;
    const y=(t,outer=false)=>spring+(outer?band:0)+(rise+(outer?band*0.25:0))*Math.pow(Math.max(0,1-t*t),0.78);
    path.moveTo(-half-band,spring-0.06);
    for(let i=0;i<=segments;i++){
      const t=-1+2*i/segments;
      path.lineTo(t*(half+band),y(t,true));
    }
    path.lineTo(half,spring);
    for(let i=segments;i>=0;i--){const t=-1+2*i/segments;path.lineTo(t*half,y(t,false));}
    path.closePath();
    return new THREE.ExtrudeGeometry(path,{depth,bevelEnabled:true,bevelSize:0.026,
      bevelThickness:0.018,bevelSegments:2,curveSegments:3});
  }
  function diamond(b,mat,x,y,z,sx,sy,sz){b.add(mat,new THREE.OctahedronGeometry(1,0),[x,y,z],[0,0,0],[sx,sy,sz]);}
  function rosette(b,x,y,z,r,rot=[0,0,0],mat='brass') {
    // Eight carved leaf petals around a faceted stone cabochon.
    for(let k=0;k<8;k++){
      const t=k*Math.PI/4;
      b.add(mat,sphere(1,6,4),[x+Math.cos(t)*r*0.48,y+Math.sin(t)*r*0.48,z],
        [0,0,t],[r*0.28,r*0.13,0.095]);
    }
    diamond(b,'iceEdge',x,y,z+0.10,r*0.23,r*0.23,0.1);
  }

  // Structural floor — top precisely Y=0; feet have no unexplained floating.
  strip(body,'shade',14,0.28,16,0,-0.23,0);
  strip(body,'ink',13.72,0.035,15.72,0,-0.047,0);
  // Perimeter and procession-band inlays are actual slim 3D metal strips.
  for(const x of [-6.66,6.66,-1.7,1.7]) strip(body,'brass',0.045,0.014,15.45,x,-0.011,0);
  for(const z of [-7.67,7.67])strip(body,'brass',13.35,0.014,0.045,0,-0.011,z);
  for(let z=2.3;z<7.55;z+=0.84){
    diamond(body,'iceEdge',0,-0.014,z,0.22,0.025,0.27);
  }
  // Shared tessellated floor tile: reuse geometry and material via instancing.
  const floorTile=box(0.938,0.04,0.94); // 12 tris/tile, not 200+ bevel triangles
  const floorMat=materials.stone;
  const floorMesh=new THREE.InstancedMesh(floorTile,floorMat,14*16);
  floorMesh.name='instanced_floor_stone_tiles';
  let fi=0;
  const temp=new THREE.Object3D();
  for(let iz=0;iz<16;iz++)for(let ix=0;ix<14;ix++){
    temp.position.set(-6.5+ix,-0.020,-7.5+iz);
    temp.rotation.set(0,0,0);temp.scale.set(1,1,1);temp.updateMatrix();
    floorMesh.setMatrixAt(fi++,temp.matrix);
  }
  floorMesh.instanceMatrix.needsUpdate=true;floorMesh.receiveShadow=true;
  main.add(floorMesh);

  // Perimeter walls built in three dimensions, except a genuinely open 3.6m
  // entry on +Z. All high windows have deeper inset housings and reveals.
  for(const x of [-6.88,6.88]){
    strip(body,'shade',0.3,6.75,15.55,x,3.375,0);
    strip(body,'stone',0.20,0.33,15.8,x,0.16,0);
    strip(body,'stone',0.22,0.35,15.8,x,6.42,0);
    strip(body,'brass',0.035,0.065,15.5,x-Math.sign(x)*0.14,0.40,0);
  }
  strip(body,'shade',13.9,6.75,0.28,0,3.375,-7.87);
  strip(body,'stone',14,0.32,0.28,0,6.44,-7.87);
  // South wall is individually hideable by the game camera.
  for(const x of [-4.44,4.44]){
    strip(south,'shade',5.13,6.65,0.30,x,3.325,7.86);
    strip(south,'stone',5.13,0.38,0.38,x,0.19,7.76);
    strip(south,'stone',5.15,0.36,0.36,x,6.43,7.76);
  }
  strip(south,'shade',3.83,2.00,0.34,0,5.67,7.84);
  // Entrance portal: solid profiled jambs, lit reveal, projecting torana.
  for(const x of [-1.88,1.88]){
    strip(south,'stone',0.37,4.75,0.70,x,2.38,7.46);
    strip(south,'brass',0.061,4.30,0.79,x-Math.sign(x)*0.20,2.22,7.45);
    strip(south,'ice',0.12,3.65,0.45,x+Math.sign(x)*0.28,2.08,7.63);
    for(let y of [0.5,1.53,2.56,3.59]){
      strip(south,'brass',0.49,0.047,0.69,x,y,7.42);
    }
  }
  strip(south,'stone',4.16,0.43,0.83,0,4.69,7.48);
  strip(south,'brass',3.6,0.067,0.87,0,4.33,7.45);
  south.add('stone',archBand(3.55,4.83,0.9,0.32,0.42),[0,0,7.03]);
  for(let j=-2;j<=2;j++){
    diamond(south,'ice',j*0.69,5.64+0.35*(1-Math.abs(j)/3),7.52,0.22,0.34,0.17);
  }
  strip(south,'amber',3.49,0.075,0.1,0,4.1,7.70);
  // Entrance clear opening never receives an invisible door plane.

  // Colonnade: original fluted radial profile; lathed stepped profiles for
  // bases and capitals. Shared geometries feed THREE.InstancedMesh.
  function flutedShaft(height=4.28,radius=0.31,flutes=12){
    const vert=[],indices=[];const sides=flutes*4,rings=8;
    for(let yi=0;yi<=rings;yi++){
      const t=yi/rings;
      const y=0.62+t*height;
      const taper=radius*(1-0.105*t);
      for(let i=0;i<=sides;i++){
        const a=i/sides*Math.PI*2;
        const r=taper*(1-0.07*(0.5-0.5*Math.cos(flutes*a)));
        vert.push(r*Math.cos(a),y,r*Math.sin(a));
      }
    }
    for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){
      const p=j*(sides+1)+i,q=p+sides+1;
      indices.push(p,q,p+1,q,q+1,p+1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vert,3));g.setIndex(indices);
    g.computeVertexNormals();return g;
  }
  // A single column geometry includes a stepped, tapered base and crown.
  const shaftGeo=flutedShaft();
  const capGeo=lathe([[0.40,0.18],[0.49,0.26],[0.47,0.39],[0.33,0.46],[0.33,0.61],
    [0.31,0.67],[0.28,4.85],[0.32,4.92],[0.46,5.02],[0.54,5.18],
    [0.52,5.29],[0.40,5.34]],16);
  const baseGeo=lathe([[0.43,0.18],[0.49,0.235],[0.46,0.29],[0.35,0.32]],12);
  const columnPositions=[];
  for(const z of [-5.85,-2.5,1.10,4.65]){
    columnPositions.push([-5.88,z],[5.88,z]);
  }
  columnPositions.push([-4.15,-6.58],[4.15,-6.58]);
  function instanceColumns(geo,material,name){
    const mesh=new THREE.InstancedMesh(geo,material,columnPositions.length);
    mesh.name=name;
    for(let i=0;i<columnPositions.length;i++){
      const [x,z]=columnPositions[i];
      temp.position.set(x,0,z);temp.rotation.set(0,0,0);temp.scale.set(1,1,1);temp.updateMatrix();
      mesh.setMatrixAt(i,temp.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;main.add(mesh);
  }
  instanceColumns(shaftGeo,materials.stone,'instanced_fluted_columns');
  instanceColumns(capGeo,materials.shade,'instanced_column_capital_profiles');
  instanceColumns(baseGeo,materials.brass,'instanced_column_foot_brass');
  for(const [x,z] of columnPositions){
    strip(body,'brass',0.74,0.055,0.74,x,0.14,z);
    // Capitals join the ceiling beam through a visible curved bracket.
    for(const s of [-1,1]) {
      body.add('stone',archBand(0.82,5.16,0.33,0.13,0.15,10),[x+s*0.26,0,z-0.08],
        [0,s?Math.PI/2:0,0],[0.85,0.85,1]);
    }
    // Carved lotus flange petals beneath every capital.
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      diamond(body,'brass',x+Math.sin(a)*0.42,4.91,z+Math.cos(a)*0.42,
        0.095,0.19,0.115);
    }
  }

  // Four finished side-wall recessed bays: real multiple-layer housings,
  // rounded profile reliefs, amber lower windows, icy clerestories.
  for(const side of [-1,1])for(const z of [-4.15,-0.60,2.95]){
    const insideX=side*6.69, frontX=side*6.53;
    // Panel reads as a deep inset even from eye-level oblique views.
    strip(body,'ink',0.075,3.61,2.54,insideX,2.45,z);
    strip(body,'ice',0.07,2.45,2.15,frontX,2.22,z);
    for(const dz of [-1.27,1.27]){
      strip(body,'stone',0.32,3.74,0.22,side*6.48,2.47,z+dz);
      for(let y of [0.72,3.42])
        diamond(body,'brass',side*6.30,y,z+dz,0.12,0.16,0.13);
    }
    strip(body,'stone',0.33,0.24,2.64,side*6.49,4.41,z);
    strip(body,'brass',0.30,0.07,2.42,side*6.30,4.12,z);
    // Warm interior beyond a deep leaded bay, not a paper decal.
    strip(body,'amber',0.07,1.64,1.57,side*6.36,2.18,z);
    for(const dz of [-0.54,0,0.54])strip(body,'brass',0.17,1.76,0.06,side*6.28,2.18,z+dz);
    strip(body,'brass',0.16,0.05,1.63,side*6.25,2.16,z);
    // High slit window reads bright blue from all walking paths.
    strip(body,'ink',0.055,0.74,1.99,side*6.66,5.66,z);
    strip(body,'blueGlow',0.04,0.54,1.71,side*6.55,5.68,z);
    for(const dz of [-0.76,0.76])strip(body,'brass',0.19,0.65,0.07,side*6.46,5.68,z+dz);
    strip(body,'iceEdge',0.22,0.12,2.02,side*6.38,6.08,z);
    // Real shallow triangulated corbels beneath the window shelf.
    for(const dz of [-0.87,0.87])diamond(body,'stone',side*6.32,4.88,z+dz,0.20,0.28,0.18);
  }
  // Rear north wall niches completed around the central feature.
  for(const x of [-4.7,4.7]){
    strip(body,'ink',2.3,3.45,0.12,x,2.47,-7.64);
    strip(body,'ice',1.92,2.96,0.18,x,2.52,-7.50);
    for(const dx of [-1.15,1.15])strip(body,'stone',0.25,3.9,0.32,x+dx,2.37,-7.44);
    strip(body,'brass',2.45,0.12,0.24,x,4.38,-7.40);
    for(let k=0;k<3;k++){
      diamond(body,'iceEdge',x+(k-1)*0.67,3.39+(k===1?0.48:0),-7.27,0.29,0.56,0.25);
    }
  }

  // Architectural far-side focal point: stepped torana, sapphire vaulted
  // recess, relief petals, miniature sanctuary silhouettes, not a flat mural.
  strip(body,'ink',5.9,5.65,0.20,0,3.20,-7.58);
  strip(body,'ice',4.75,4.42,0.26,0,2.84,-7.34);
  for(const x of [-2.74,2.74]){
    strip(body,'stone',0.51,5.38,0.58,x,2.85,-7.19);
    strip(body,'brass',0.10,4.74,0.64,x-Math.sign(x)*0.34,2.80,-7.18);
  }
  body.add('stone',archBand(5.4,4.96,1.18,0.45,0.45),[0,0,-7.40]);
  body.add('brass',archBand(4.60,4.89,0.94,0.10,0.20),[0,0,-6.94]);
  strip(body,'stone',6.05,0.36,0.70,0,5.9,-7.16);
  // Small roof tiers identify the culture without inscription or invented dates.
  for(let tier=0;tier<3;tier++){
    const w=4.20-tier*0.83,y=5.89+tier*0.14;
    body.add('stone',chamfer(w,0.73,0.22,0.17,0.035),[0,y,-7.15]);
    strip(body,'brass',w-0.20,0.035,0.60,0,y+0.24,-7.15);
    for(let k=0;k<5-tier;k++){
      const xp=(k-(4-tier)/2)*0.78;
      diamond(body,'ice',xp,y+0.27,-7.13,0.20,0.22,0.16);
    }
  }
  // Layered solar lotus disk: explicitly sculpted, not historically specific.
  body.add('brass',disc(0.97,0.13,32),[0,3.20,-6.90],[Math.PI/2,0,0]);
  body.add('iceEdge',disc(0.71,0.18,32),[0,3.20,-6.77],[Math.PI/2,0,0]);
  for(let k=0;k<12;k++){
    const a=k*Math.PI/6;
    body.add('brass',sphere(1,6,4),[Math.cos(a)*1.21,3.20+Math.sin(a)*1.21,-6.89],
      [0,0,a],[0.26,0.12,0.10]);
  }
  diamond(body,'ice',0,3.20,-6.60,0.33,0.43,0.15);

  // Genuine low raised platform, four shallow approach ramps, a walkable
  // circulation route around the full central four-sided game table.
  const TZ=-0.70;
  body.add('shade',chamfer(5.25,5.25,0.60,0.14,0.032),[0,0.011,TZ]);
  body.add('stone',chamfer(4.98,4.98,0.52,0.06,0.025),[0,0.158,TZ]);
  for(const x of [-2.31,2.31])strip(body,'brass',0.055,0.028,3.66,x,0.213,TZ);
  for(const z of [TZ-2.31,TZ+2.31])strip(body,'brass',3.66,0.028,0.055,0,0.213,z);
  // ramps: no upright step barrier in the approach path
  for(const dir of [-1,1]){
    body.add('stone',ramp(1.85,0.87,0.24),[0,0.005,TZ+dir*2.85],
      [0,dir===1?Math.PI/2:-Math.PI/2,0]);
    body.add('stone',ramp(1.85,0.87,0.24),[dir*2.85,0.005,TZ],
      [0,dir===1?Math.PI:0,0]);
  }
  // Carved table plinth / four legs / wide four-sided floor silhouette.
  body.add('ink',chamfer(2.9,2.9,0.28,0.12,0.016),[0,0.22,TZ]);
  body.add('brass',chamfer(2.66,2.66,0.24,0.05,0.021),[0,0.34,TZ]);
  for(const x of [-1.04,1.04])for(const z of [TZ-1.04,TZ+1.04]){
    body.add('stone',lathe([[0.27,0],[0.34,0.07],[0.25,0.20],[0.23,0.57],
      [0.34,0.68],[0.31,0.75]],14),[x,0.43,z]);
    body.add('brass',torus(0.265,0.035,5,16),[x,0.79,z],[Math.PI/2,0,0]);
    diamond(body,'iceEdge',x,0.65,z,0.18,0.20,0.18);
  }
  // carved table skirt has visible depth from a penguin's eye line
  body.add('stone',chamfer(3.34,3.34,0.34,0.19,0.038),[0,0.99,TZ]);
  body.add('brass',chamfer(3.17,3.17,0.26,0.05,0.016),[0,1.195,TZ]);
  body.add('ink',chamfer(2.61,2.61,0.13,0.024,0.004),[0,1.253,TZ]);
  for(const x of [-1.62,1.62])for(const z of [TZ-1.62,TZ+1.62]){
    diamond(body,'iceEdge',x,1.13,z,0.15,0.19,0.15);
  }
  // Decorative uninterrupted dark grid grooves: ALL 64 squares use the same
  // uniform sapphire stone. No checkerboard colors, labels or dice rules.
  const boardTile=box(0.294,0.012,0.294); // uniform color and visible dark incised joints
  const board=new THREE.InstancedMesh(boardTile,materials.iceEdge,64);
  board.name='instanced_8x8_uncheckered_display_grid';
  let bi=0;
  for(let z=0;z<8;z++)for(let x=0;x<8;x++){
    temp.position.set((x-3.5)*0.313,1.286,TZ+(z-3.5)*0.313);
    temp.rotation.set(0,0,0);temp.scale.set(1,1,1);temp.updateMatrix();
    board.setMatrixAt(bi++,temp.matrix);
  }
  board.instanceMatrix.needsUpdate=true;board.receiveShadow=true;main.add(board);
  // Board perimeter fine inset wire, physical brass ridge not baked bitmap.
  for(const x of [-1.28,1.28])strip(body,'brass',0.036,0.025,2.58,x,1.272,TZ);
  for(const z of [TZ-1.28,TZ+1.28])strip(body,'brass',2.58,0.025,0.036,0,1.272,z);
  // All display pieces are a single vertex-colored merged mesh. Four armies
  // are sculptural ornament, not playable or historically authoritative.
  const teamColors=[0xc81818,0x0844a6,0x378839,0xf88898];
  const pieceBase=cylinder(0.079,0.095,0.048,10);
  const pieceCollar=cylinder(0.075,0.085,0.025,10);
  const pieceStem=lathe([[0.055,0],[0.068,0.035],[0.057,0.09],
    [0.041,0.16],[0.064,0.19]],10);
  const spire=cylinder(0,0.08,0.15,8);
  for(let team=0;team<4;team++)for(let i=0;i<8;i++){
    let x,z;
    if(team===0){x=(i-3.5)*0.313;z=TZ+3*0.313;}
    if(team===1){x=(i-3.5)*0.313;z=TZ-3*0.313;}
    if(team===2){x=-3*0.313;z=TZ+(i-3.5)*0.313;}
    if(team===3){x=3*0.313;z=TZ+(i-3.5)*0.313;}
    const yy=1.315;
    body.add('painted',pieceBase,[x,yy+0.031,z],[0,0,0],[1,1,1],teamColors[team]);
    body.add('brass',pieceCollar,[x,yy+0.063,z]);
    body.add('painted',pieceStem,[x,yy+0.074,z],[0,0,0],[1,1,1],teamColors[team]);
    if(i===3 || i===4){
      // Royal/tower outline distinct from pawns, but display-only.
      body.add('painted',cylinder(0.081,0.066,0.09,8),[x,yy+0.292,z],
        [0,0,0],[1,1,1],teamColors[team]);
      body.add('brass',cylinder(0.045,0.092,0.042,8),[x,yy+0.355,z]);
    }else if(i===0 || i===7){
      body.add('painted',box(0.13,0.085,0.13),[x,yy+0.276,z],
        [0,0,0],[1,1,1],teamColors[team]);
    }else{
      body.add('painted',spire,[x,yy+0.265,z],[0,0,0],[0.7,0.9,0.7],teamColors[team]);
    }
  }

  // Two distinct educational stations with intentionally BLANK plaque areas.
  // App provides text; this module claims no historical dice-rule provenance.
  const plaqueBox=box(0.92,0.48,0.042);
  const heritageX=-4.85, tutorialX=4.85;
  // Heritage stone reading lectern: slanted carved wedge and book relief.
  body.add('shade',chamfer(1.18,1.08,0.20,0.18,0.02),[heritageX,0.01,-0.80]);
  body.add('stone',lathe([[0.21,0],[0.28,0.12],[0.18,0.35],[0.16,0.88],[0.29,0.96]],16),
    [heritageX,0.24,-0.80]);
  body.add('stone',box(1.25,0.18,0.69),[heritageX,1.27,-0.73],[0,0,-0.26]);
  body.add('brass',box(1.31,0.045,0.75),[heritageX,1.365,-0.74],[0,0,-0.26]);
  // Sculpted open scroll / book sides with blank deep blue reading area.
  for(const x of [heritageX-0.39,heritageX+0.39]){
    body.add('stone',cylinder(0.07,0.07,0.62,10),[x,1.445,-0.74],[Math.PI/2,0,0]);
  }
  body.add('ink',plaqueBox,[heritageX,1.492,-0.72],[-0.38,0,0]);
  for(const dx of [-0.53,0.53])diamond(body,'brass',heritageX+dx,1.54,-0.70,0.065,0.10,0.08);
  // Tutorial crystal station: geometric upright frame, icy slate, brass rails.
  body.add('shade',chamfer(1.20,1.08,0.24,0.16,0.015),[tutorialX,0.01,-0.80]);
  for(const x of [tutorialX-0.46,tutorialX+0.46]){
    strip(body,'brass',0.095,1.25,0.10,x,0.85,-0.80);
    diamond(body,'iceEdge',x,1.58,-0.80,0.20,0.32,0.20);
  }
  body.add('ice',chamfer(1.11,0.29,0.10,0.19,0.012),[tutorialX,0.31,-0.80]);
  strip(body,'iceEdge',1.02,0.89,0.105,tutorialX,1.11,-0.79);
  strip(body,'ink',0.92,0.68,0.06,tutorialX,1.12,-0.712);
  for(const x of [tutorialX-0.55,tutorialX+0.55]){
    strip(body,'brass',0.04,0.91,0.12,x,1.12,-0.69);
  }
  strip(body,'amber',0.58,0.035,0.07,tutorialX,0.69,-0.64);
  diamond(body,'iceEdge',tutorialX,1.78,-0.72,0.20,0.32,0.18);

  // No dedicated lantern point lights: each warm chamber is an illuminated
  // emissive polygon held by an actual octagonal brass cage with tapered roof.
  function lantern(b,x,y,z,scale=1,ry=0) {
    const R=0.21*scale;
    b.add('amber',cylinder(R*0.9,R*0.9,0.36*scale,8),[x,y,z],[0,ry,0]);
    b.add('brass',cylinder(R*1.25,R,0.105*scale,8),[x,y+0.23*scale,z],[0,ry,0]);
    b.add('brass',cylinder(R,R*1.10,0.07*scale,8),[x,y-0.21*scale,z],[0,ry,0]);
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4+ry;
      const px=x+Math.sin(a)*R,pz=z+Math.cos(a)*R;
      strip(b,'brass',0.033*scale,0.42*scale,0.033*scale,px,y,pz);
    }
    b.add('brass',cylinder(0.036*scale,0.036*scale,0.13*scale,8),
      [x,y+0.33*scale,z]);
    diamond(b,b===south?'ice':'iceEdge',x,y+0.40*scale,z,0.065*scale,0.12*scale,0.065*scale);
  }
  // Warm pools near the table; cool light from high wall slits is simulated
  // with emissive panels, keeping lighting portable on ordinary Androids.
  for(const x of [-3.28,3.28])for(const z of [-3.55,2.25]){
    lantern(body,x,2.0,z,0.85);
    strip(body,'brass',0.048,0.77,0.048,x,2.76,z);
  }
  for(const x of [-2.55,2.55])lantern(south,x,3.12,7.46,0.95);
  for(const x of [-4.22,4.22])lantern(body,x,3.42,-6.72,0.76);

  // Modelled ceiling, not a blank overhead plane. Explicit separate group
  // allows host to hide it when camera is above / behind penguin.
  strip(crown,'ink',13.78,0.24,15.75,0,7.12,0);
  strip(crown,'ice',13.24,0.15,15.05,0,6.98,0);
  for(const x of [-6.5,6.5])strip(crown,'stone',0.62,0.58,16.1,x,6.53,0);
  for(const z of [-7.38,7.38])strip(crown,'stone',13.9,0.58,0.62,0,6.53,z);
  // 6x7 coffered ceiling with deep physically modelled oak-like stone beams.
  for(let xi=-3;xi<=3;xi++){
    const x=xi*1.85;
    strip(crown,'stone',0.21,0.52,14.7,x,6.70,0);
    strip(crown,'brass',0.035,0.04,14.7,x,6.41,0);
  }
  for(let zi=-4;zi<=4;zi++){
    const z=zi*1.76;
    strip(crown,'stone',12.7,0.52,0.22,0,6.70,z);
    strip(crown,'brass',12.7,0.04,0.036,0,6.41,z);
  }
  for(let i=-3;i<=2;i++)for(let j=-4;j<=3;j++){
    const x=(i+0.5)*1.85,z=(j+0.5)*1.76;
    // Each coffer center has deep sapphire facets and brass diamond bas-relief.
    diamond(crown,'ice',x,6.81,z,0.67,0.15,0.60);
    diamond(crown,'brass',x,6.64,z,0.23,0.095,0.20);
  }
  // Beam ends are really supported by the capitals, not floating scenery.
  for(const [x,z] of columnPositions){
    strip(crown,'stone',0.72,0.25,0.75,x,5.65,z);
    strip(crown,'brass',0.75,0.045,0.79,x,5.52,z);
  }
  // Octagonal lotus canopy suspended over table, well above camera head.
  crown.add('brass',torus(1.52,0.09,7,8),[0,5.77,TZ],[Math.PI/2,0,0]);
  crown.add('ice',cylinder(1.10,1.38,0.28,8),[0,5.88,TZ]);
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4;
    diamond(crown,'brass',Math.cos(a)*1.43,5.58,TZ+Math.sin(a)*1.43,0.18,0.22,0.18);
  }
  crown.add('amber',sphere(0.26,10,6),[0,5.41,TZ],[0,0,0],[1,0.75,1]);
  crown.add('brass',cylinder(0.1,0.1,0.44,8),[0,5.96,TZ]);

  body.finish(); south.finish(); crown.finish();
  // Colliders in ASSET-LOCAL coords. Low dais and ramps remain traversable.
  // Roof ornaments and decorative torana eaves have NO invisible walls.
  const colliders = [
    {name:'floor',kind:'floor',center:[0,-0.16,0],size:[14,0.32,16]},
    {name:'westWall',kind:'solid',center:[-6.89,3.3,0],size:[0.23,6.6,15.85]},
    {name:'eastWall',kind:'solid',center:[6.89,3.3,0],size:[0.23,6.6,15.85]},
    {name:'northWall',kind:'solid',center:[0,3.3,-7.89],size:[13.84,6.6,0.23]},
    {name:'southWestWall',kind:'solid',center:[-4.46,3.3,7.87],size:[5.07,6.6,0.24]},
    {name:'southEastWall',kind:'solid',center:[4.46,3.3,7.87],size:[5.07,6.6,0.24]},
    {name:'entryLintel',kind:'solid',center:[0,5.65,7.87],size:[3.8,2.0,0.25]},
    {name:'table',kind:'solid',center:[0,0.84,TZ],size:[3.34,1.68,3.34]},
    {name:'heritagePedestal',kind:'solid',center:[heritageX,0.80,-0.80],size:[1.35,1.6,1.0]},
    {name:'tutorialStation',kind:'solid',center:[tutorialX,0.95,-0.80],size:[1.24,1.9,1.08]}
  ];
  columnPositions.forEach(([x,z],i)=>colliders.push({
    name:`column${String(i+1).padStart(2,'0')}`,kind:'solid',
    center:[x,2.60,z],size:[0.76,5.20,0.76]
  }));
  root.userData.assetId='chaturanga-interior';
  root.userData.status='DRAFT';
  root.userData.units='metres';
  root.userData.room={width:14,depth:16,finishedFloorY:0,entranceFaces:'+Z'};
  root.userData.cameraFacingGroups=['cameraFacingWalls','cameraFacingCeiling'];
  root.userData.heritageDisclaimer='Modern Chaturanga-inspired adaptation; no historical dice rules are asserted.';
  return {root,colliders,anchors};
}
