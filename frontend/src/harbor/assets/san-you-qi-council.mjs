/**
 * SAN YOU QI COUNCIL HALL — Antarctic Kingdoms / Lantern Harbor
 * DRAFT asset, original procedural geometry, metres, +Y up, entrance +Z.
 * Host contract: buildSanYouQiCouncil(THREE) -> { root, colliders, anchors }.
 * No renderer, app listeners, external data, textures or imported dependencies.
 *
 * The static geometry is combined by material to keep draw calls affordable.
 * The sign is separately combined into its own removable group.
 */
export function buildSanYouQiCouncil(THREE) {
  const root = new THREE.Group();
  root.name = 'SanYouQiCouncilHall_DRAFT';
  const SIGN = new THREE.Group();
  SIGN.name = 'removableSign';
  SIGN.userData.removable = true;
  root.add(SIGN);

  const palette = {
    ice:        [0x175d86, 0.19, 0.43],
    iceFacet:   [0x48a7ca, 0.16, 0.30],
    stone:      [0xcddad8, 0.03, 0.91],
    pale:       [0xe8e5db, 0.04, 0.85],
    shadow:     [0x809a9b, 0.04, 0.91],
    teal:       [0x103f4d, 0.23, 0.49],
    tealTrim:   [0x236776, 0.24, 0.38],
    roof:       [0x0b5265, 0.22, 0.37],
    roofFacet:  [0x237e91, 0.22, 0.32],
    snow:       [0xe7f3f4, 0.03, 0.86],
    gold:       [0xb89953, 0.65, 0.28],
    goldLight:  [0xe2c989, 0.58, 0.28],
    wood:       [0x412f2d, 0.03, 0.84],
    interior:   [0x6e4932, 0.08, 0.79],
    glow:       [0xfbb968, 0.02, 0.78],
    ember:      [0xffd28c, 0.00, 0.69],
  };
  const materials = {};
  for (const [k, [color, metalness, roughness]] of Object.entries(palette)) {
    const emissive = k === 'glow' || k === 'ember' ? 0xb36a29 : 0x000000;
    materials[k] = new THREE.MeshStandardMaterial({
      color, metalness, roughness, emissive,
      emissiveIntensity: k === 'glow' ? 0.55 : k === 'ember' ? 0.86 : 0,
      side: THREE.DoubleSide,
    });
  }
  const GLASS = new THREE.MeshStandardMaterial({
    color: 0xffc684, roughness: 0.14, metalness: 0.04,
    emissive: 0xf08c3b, emissiveIntensity: 0.28,
    transparent: true, opacity: 0.80, depthWrite: false, side: THREE.DoubleSide,
  });
  materials.glass = GLASS;

  const tempMatrix = new THREE.Matrix4();
  const tempQuat = new THREE.Quaternion();
  const tempEuler = new THREE.Euler();
  const buckets = new Map();
  const signBuckets = new Map();
  const baseBox = new THREE.BoxGeometry(1, 1, 1);
  const baseCylinder = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
  const baseSphere = new THREE.IcosahedronGeometry(1, 1);

  function bake(g, key, x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1, sign=false) {
    tempEuler.set(rx, ry, rz);
    tempQuat.setFromEuler(tempEuler);
    tempMatrix.compose(new THREE.Vector3(x,y,z), tempQuat, new THREE.Vector3(sx,sy,sz));
    // No mutation of reused geometry; transformations happen on a temporary copy.
    const q = g.clone();
    q.applyMatrix4(tempMatrix);
    const unpacked = q.index ? q.toNonIndexed() : q;
    if (!unpacked.getAttribute('normal')) unpacked.computeVertexNormals();
    const store = sign ? signBuckets : buckets;
    if (!store.has(key)) store.set(key, []);
    store.get(key).push(unpacked);
    if (unpacked !== q) q.dispose();
  }
  function box(k,w,h,d,x,y,z, ry=0, sign=false) {
    bake(baseBox,k,x,y,z,0,ry,0,w,h,d,sign);
  }
  function rod(k, a, b, radius=.035, radial=8, sign=false) {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b);
    const len = p.distanceTo(q);
    if (len < 1e-5) return;
    const v = q.clone().sub(p).normalize();
    const geo = new THREE.CylinderGeometry(radius, radius, len, radial, 1, false);
    geo.quaternion; // geometry stays in Y; rotation applied via quaternion to vertices
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v);
    const m = new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(.5),quaternion,new THREE.Vector3(1,1,1));
    const clone=geo.clone(); clone.applyMatrix4(m);
    bake(clone,k,0,0,0,0,0,0,1,1,1,sign);
    geo.dispose(); clone.dispose();
  }
  function cyl(k,rad,height,x,y,z,radial=12,topRad=rad) {
    const useUnit = topRad===rad && radial===12;
    const g = useUnit ? baseCylinder :
      new THREE.CylinderGeometry(topRad,rad,1,radial,1);
    bake(g,k,x,y,z,0,0,0,useUnit?rad:1,height,useUnit?rad:1);
    if (g!==baseCylinder) g.dispose();
  }
  function facet(k, sx, sy, sz, x, y, z) {
    bake(baseSphere,k,x,y,z,0,0,0,sx,sy,sz);
  }
  function meshTriangles(k, pts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pts.flat(),3));
    g.computeVertexNormals();
    bake(g,k);
    g.dispose();
  }
  function quad(k,a,b,c,d) {meshTriangles(k,[a,b,c,a,c,d]);}
  function prismXZ(k,outline,lo,hi) {
    const pts=[];
    const x=outline.reduce((s,v)=>s+v[0],0)/outline.length;
    const z=outline.reduce((s,v)=>s+v[1],0)/outline.length;
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];
      pts.push([x,hi,z],[b[0],hi,b[1]],[a[0],hi,a[1]]);
      pts.push([x,lo,z],[a[0],lo,a[1]],[b[0],lo,b[1]]);
      pts.push([a[0],lo,a[1]],[a[0],hi,a[1]],[b[0],hi,b[1]]);
      pts.push([a[0],lo,a[1]],[b[0],hi,b[1]],[b[0],lo,b[1]]);
    }
    meshTriangles(k,pts);
  }
  function finalize(store,parent) {
    let tris=0, calls=0;
    for (const [key, list] of store.entries()) {
      let n=0;
      for(const g of list) n += g.getAttribute('position').array.length;
      const p=new Float32Array(n), normals=new Float32Array(n);
      let idx=0;
      for(const g of list){
        const a=g.getAttribute('position').array;
        const b=g.getAttribute('normal').array;
        p.set(a,idx); normals.set(b,idx); idx+=a.length;
        g.dispose();
      }
      const out=new THREE.BufferGeometry();
      out.setAttribute('position',new THREE.BufferAttribute(p,3));
      out.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      out.computeBoundingSphere();
      const m=new THREE.Mesh(out, materials[key]);
      m.name=`baked_${key}`;
      m.castShadow=true; m.receiveShadow=true;
      m.frustumCulled=true;
      parent.add(m);
      tris+=p.length/9;
      calls++;
    }
    return {triangles:Math.round(tris),drawCalls:calls};
  }

  // World-space wing frame. Wing longitudinal v extends OUTWARD from the hub.
  function wingFrame(x,z,dx,dz,length,width,name) {
    const l=Math.hypot(dx,dz),d=[dx/l,dz/l];
    const u=[d[1],-d[0]], theta=Math.atan2(d[0],d[1]);
    return {name,x,z,d,u,theta,length,width};
  }
  function WP(w,t,y,v) {return [w.x+w.u[0]*t+w.d[0]*v,y,w.z+w.u[1]*t+w.d[1]*v];}
  function WB(w,k,width,height,length,t,y,v) {
    const p=WP(w,t,y,v);
    box(k,width,height,length,p[0],p[1],p[2],w.theta);
  }
  function WR(w,k,t0,y0,v0,t1,y1,v1,r=.025,ns=8){
    rod(k,WP(w,t0,y0,v0),WP(w,t1,y1,v1),r,ns);
  }
  const hubRadius=1.83;
  const hubZ=-.22;
  const oct=[];
  for(let i=0;i<8;i++){
    const ang=(22.5+i*45)*Math.PI/180;
    oct.push([hubRadius*Math.cos(ang),hubZ+hubRadius*Math.sin(ang)]);
  }
  const front=wingFrame(0,.80,0,1,2.91,2.64,'entry');
  const rearL=wingFrame(-1.02,-.89,-.73,-.68,2.74,2.08,'leftCouncil');
  const rearR=wingFrame(1.02,-.89,.73,-.68,2.74,2.08,'rightCouncil');
  const wings=[front,rearL,rearR];

  // FOUNDATION: ice rim, stone landing, joined but unmistakably Y-shaped.
  prismXZ('ice',oct,-.46,-.08);
  prismXZ('iceFacet',oct,-.24,-.13);
  prismXZ('pale',oct,-.07,.035);
  for(const w of wings){
    const hw=w.width/2+.08;
    const outline=[WP(w,-hw,0,-.15),WP(w,hw,0,-.15),
      WP(w,hw,0,w.length+.10),WP(w,-hw,0,w.length+.10)].map(p=>[p[0],p[2]]);
    prismXZ('ice',outline,-.44,-.08);
    prismXZ('iceFacet',outline,-.25,-.15);
    prismXZ('pale',outline,-.08,.035);
  }
  // Concentric polygonal ice facets below the central floor.
  for(let i=0;i<8;i++){
    const a=oct[i],b=oct[(i+1)%8];
    const mid=[(a[0]+b[0])*.5,(a[1]+b[1])*.5];
    quad('iceFacet',[a[0],-.41,a[1]],[b[0],-.41,b[1]],
      [mid[0]*1.035,-.17,hubZ+(mid[1]-hubZ)*1.035],[mid[0]*.965,-.17,hubZ+(mid[1]-hubZ)*.965]);
  }
  // Indoor three-spoke floor relief (no doorway blockage), visible through portals.
  for(const w of wings){
    const start=WP(w,0,.048,.05), end=WP(w,0,.048,w.length-.15);
    rod('gold',start,end,.019,6);
    for(let i=-1;i<=1;i++){
      const p=WP(w,i*.31,.06,w.length*.25);
      facet(i===0?'goldLight':'tealTrim',.09,.018,.09,p[0],p[1],p[2]);
    }
  }
  // Three front-entry steps, kept inside the 9 x 8 m nominal footprint.
  box('ice',2.55,.14,.38,0,-.34,3.81);
  box('pale',2.33,.10,.31,0,-.215,3.69);
  box('snow',2.55,.035,.13,0,-.258,3.87);
  box('tealTrim',2.45,.035,.055,0,-.29,3.97);

  // CENTRAL OCTAGON: three open faces at +Z / rear-left / rear-right.
  // Face angles are 45,90,...,315 degrees; face 90,225,315 are the portals.
  for(let i=0;i<8;i++){
    const a=oct[i],b=oct[(i+1)%8];
    const cx=(a[0]+b[0])*.5,cz=(a[1]+b[1])*.5;
    const angle=((Math.atan2(cz-hubZ,cx)*180/Math.PI)+360)%360;
    const passage=[90,225,315].some(v=>Math.abs(angle-v)<4);
    if(!passage){
      const d=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const theta=-Math.atan2(b[1]-a[1],b[0]-a[0]);
      box('stone',d,2.89,.18,cx,1.63,cz,theta);
      box('teal',d+.06,.15,.25,cx,.25,cz,theta);
      box('tealTrim',d+.12,.12,.24,cx,3.08,cz,theta);
      for(const p of [a,b]){
        box('pale',.23,3.03,.23,p[0],1.66,p[1]);
        box('gold',.28,.07,.28,p[0],2.94,p[1]);
      }
      // Restrained star/sun insignia on an occupied wall panel.
      const nx=(cx)/Math.hypot(cx,cz-hubZ),nz=(cz-hubZ)/Math.hypot(cx,cz-hubZ);
      facet('shadow',.16,.28,.04,cx+nx*.12,1.65,cz+nz*.12);
    } else {
      // Real open portals, with posts and visible underside of the tie beam.
      const mid=[cx,cz];
      box('teal',.22,2.88,.23,a[0],1.64,a[1]);
      box('teal',.22,2.88,.23,b[0],1.64,b[1]);
      const theta=-Math.atan2(b[1]-a[1],b[0]-a[0]);
      box('teal',Math.hypot(b[0]-a[0],b[1]-a[1])+.1,.23,.27,mid[0],3.0,mid[1],theta);
      rod('goldLight',[a[0],2.83,a[1]],[b[0],2.83,b[1]],.023,6);
    }
  }

  // Wing profile: stone full-height walls, real cuts for the THREE large windows.
  function wingWalls(w,wingIdx) {
    const h=w.width*.5,L=w.length;
    const selectedSide=wingIdx===0?-1:wingIdx===1?1:-1;
    for(const side of [-1,1]){
      const u=side*h;
      const isWindow=side===selectedSide;
      if(isWindow){
        const v0=L*.43-.51,v1=L*.43+.51;
        WB(w,'stone',.17,2.96,v0+.04,u,1.63,(v0-.04)/2);
        WB(w,'stone',.17,2.96,L-v1+.05,u,1.63,(v1+L)/2);
        WB(w,'stone',.17,1.01,v1-v0+.07,u,.72,(v0+v1)/2);
        WB(w,'stone',.17,.61,v1-v0+.07,u,2.83,(v0+v1)/2);
        WB(w,'teal',.26,.16,v1-v0+.19,u,1.19,(v0+v1)/2);
        WB(w,'gold',.24,.07,v1-v0+.22,u,2.49,(v0+v1)/2);
        for(const v of [v0,v1]){
          WB(w,'teal',.30,1.32,.13,u,1.85,v);
          WB(w,'goldLight',.05,1.28,.11,u+side*.13,1.85,v);
        }
        // Glowing pane is set IN from wall; a small furnished amber bay behind it.
        WB(w,'interior',.04,1.21,1.04,u-side*.29,1.83,(v0+v1)/2);
        WB(w,'glow',.022,1.12,.96,u-side*.13,1.83,(v0+v1)/2);
        // Thin translucent layer; no large textures and one material bucket.
        WB(w,'glass',.025,1.10,.91,u+side*.016,1.83,(v0+v1)/2);
        for(let j=-1;j<=1;j++){
          WB(w,'goldLight',.038,1.16,.026,u+side*.052,1.83,(v0+v1)/2+j*.29);
        }
        for(let j=-1;j<=1;j++){
          WB(w,'gold',.041,.024,.98,u+side*.052,1.83+j*.29,(v0+v1)/2);
        }
        // Lattice X diamonds are true slim rods that catch specular highlights.
        for(let j=0;j<2;j++){
          const av=v0+.09+j*.46,bv=av+.41;
          WR(w,'gold',u+side*.079,1.33,av,u+side*.079,2.32,bv,.018,6);
          WR(w,'gold',u+side*.079,2.32,av,u+side*.079,1.33,bv,.018,6);
        }
        // Interior silhouette: tabletop and cabinet rails behind an amber glass bay.
        WB(w,'wood',.13,.07,.78,u-side*.43,1.39,(v0+v1)/2);
        WB(w,'gold',.12,.035,.48,u-side*.46,1.54,(v0+v1)/2);
      } else {
        WB(w,'stone',.18,2.98,L+.08,u,1.65,L/2);
        for(const v of [L*.34,L*.69]){
          WB(w,'shadow',.045,1.56,.36,u+side*.12,1.53,v);
          WB(w,'pale',.07,1.31,.21,u+side*.15,1.54,v);
          WB(w,'gold',.07,.042,.3,u+side*.16,2.14,v);
        }
      }
      // Plinth / eave beam and seams: continuous and visible at eye height.
      WB(w,'teal',.28,.22,L+.2,u,.24,L/2);
      WB(w,'teal',.30,.18,L+.30,u,3.13,L/2);
      WB(w,'gold',.29,.045,L+.31,u,3.02,L/2);
      for(const v of [.15,L-.13]){
        WB(w,'tealTrim',.30,2.96,.23,u,1.66,v);
        WB(w,'pale',.36,.12,.31,u,2.89,v);
        WB(w,'gold',.37,.05,.33,u,2.98,v);
        WB(w,'shadow',.43,.14,.39,u,.36,v);
      }
    }
    if(wingIdx===0){
      // FRONT CAP IS INTERRUPTED: 1.80 m doorway clear width and 2.42 m height.
      const sideW=(w.width-1.82)*.5;
      for(const side of [-1,1]){
        WB(w,'stone',sideW,2.99,.20,side*(.91+sideW*.5),1.64,L);
        WB(w,'teal',.20,2.79,.39,side*.94,1.61,L+.01);
        WB(w,'pale',.25,.20,.43,side*.95,2.45,L+.015);
        WB(w,'goldLight',.075,2.20,.075,side*.885,1.19,L+.19);
      }
      WB(w,'teal',2.34,.29,.35,0,2.65,L);
      WB(w,'goldLight',2.26,.052,.38,0,2.51,L+.04);
      WB(w,'wood',1.63,.035,2.46,0,.092,L-1.21);
      for(const side of [-1,1]){
        WB(w,'tealTrim',.12,2.23,2.57,side*.84,1.28,L-1.26);
        // Timber beams + interior-visible supports define passage depth.
        WB(w,'goldLight',.075,.082,2.39,side*.8,2.42,L-1.21);
      }
      WB(w,'glow',1.50,2.0,.032,0,1.24,L-2.56); // warmly lit inner wall
      WB(w,'wood',1.43,.37,.043,0,.55,L-2.53);
      // The sightline ends at an occupied, articulated council alcove,
      // not a featureless glowing rectangle.
      const back=L-2.53;
      for(const s of [-1,1]){
        WB(w,'teal',.10,1.88,.075,s*.69,1.30,back+.06);
        WB(w,'goldLight',.029,1.70,.082,s*.62,1.39,back+.10);
      }
      WB(w,'teal',1.45,.10,.080,0,2.24,back+.06);
      WB(w,'gold',1.45,.044,.086,0,2.16,back+.09);
      WB(w,'wood',1.44,.33,.075,0,.65,back+.075);
      WB(w,'tealTrim',1.10,.052,.085,0,1.11,back+.09);
      // Small triptych relief repeats the three-friends emblem beyond the door.
      for(const xx of [-.37,0,.37]){
        const innerRing=new THREE.TorusGeometry(.125,.026,6,16);
        bake(innerRing,'goldLight',xx,1.66,w.z+back+.13);
        innerRing.dispose();
        facet('teal',.062,.062,.031,xx,1.66,w.z+back+.155);
      }
      // Front entrance canopy bracket join: visible undersides.
      for(const side of [-1,1]){
        WR(w,'gold',side*.93,2.49,L-.26,side*1.24,3.07,L+.1,.038,8);
      }
    } else {
      // Rear wall of each wing really exists, incl. gable tympanum.
      WB(w,'stone',w.width,2.99,.20,0,1.64,L);
      WB(w,'teal',w.width+.2,.27,.34,0,3.05,L+.02);
      WB(w,'gold',w.width*.61,.09,.10,0,2.54,L+.15);
      // A modest recessed council chamber relief on the back, four-side completeness.
      WB(w,'shadow',.88,1.37,.07,0,1.62,L+.13);
      WB(w,'tealTrim',.66,1.12,.09,0,1.64,L+.19);
      facet('gold',.14,.20,.10,...WP(w,0,1.87,L+.22));
    }
    // Gabled infill panel at end, not a roof hovering above a flat-topped box.
    for(const v of [L]){
      const a=WP(w,-w.width*.5,3.16,v),b=WP(w,w.width*.5,3.16,v);
      const c=WP(w,0,4.06,v);
      meshTriangles('pale',[a,b,c]);
      WR(w,'gold',-w.width*.48,3.19,v,0,4.00,v,.026,8);
      WR(w,'gold',0,4.00,v,w.width*.48,3.19,v,.026,8);
    }
  }
  wings.forEach(wingWalls);

  // Wing roof: continuous custom cambered two-sided tiles, exposed under-eaves,
  // large ridges. Three roof axes remain legible from elevated rear views.
  function roofY(t) {return 4.15 - 1.03*Math.pow(t,1.18) + .17*Math.pow(t,14);}
  function wingRoof(w, idx){
    const half=w.width*.5+.27;
    const v0=-.43,v1=w.length+(idx===0?.19:.28);
    for(const side of [-1,1]){
      const nx=8,nz=16;
      for(let i=0;i<nx;i++){
        const t0=i/nx,t1=(i+1)/nx;
        for(let j=0;j<nz;j++){
          const vv0=v0+(v1-v0)*j/nz,vv1=v0+(v1-v0)*(j+1)/nz;
          const a=WP(w,side*half*t0,roofY(t0),vv0);
          const b=WP(w,side*half*t1,roofY(t1),vv0);
          const c=WP(w,side*half*t1,roofY(t1),vv1);
          const d=WP(w,side*half*t0,roofY(t0),vv1);
          quad((i+j)%7===0?'roofFacet':'roof',a,b,c,d);
          if(i>=4 && i<=6 && (j===4 || j===10 || j===13)){
            // Irregular stepped snow in small up-facing patches.
            const rise=.036;
            quad('snow',
              WP(w,side*half*t0,roofY(t0)+rise,vv0),
              WP(w,side*half*t1,roofY(t1)+rise,vv0),
              WP(w,side*half*t1,roofY(t1)+rise,vv1),
              WP(w,side*half*t0,roofY(t0)+rise,vv1));
          }
        }
      }
      // Finite roof thickness and dark underside (especially inside notches).
      const verts=[];
      for(let i=0;i<8;i++){
        const a=i/8,b=(i+1)/8;
        for(const vv of [v0,v1]){
          const p0=WP(w,side*half*a,roofY(a)-.14,vv);
          const p1=WP(w,side*half*b,roofY(b)-.14,vv);
          const p2=WP(w,side*half*b,roofY(b),vv);
          const p3=WP(w,side*half*a,roofY(a),vv);
          verts.push(p0,p1,p2,p0,p2,p3);
        }
        const q0=WP(w,side*half*a,roofY(a)-.14,v0);
        const q1=WP(w,side*half*b,roofY(b)-.14,v0);
        const q2=WP(w,side*half*b,roofY(b)-.14,v1);
        const q3=WP(w,side*half*a,roofY(a)-.14,v1);
        verts.push(q0,q1,q2,q0,q2,q3);
      }
      meshTriangles('teal',verts);
      // Recessed beams on underside lead back to the central chamber.
      for(const v of [v0+.12,v0+.87,v1-.2]){
        WR(w,'tealTrim',0,4.03,v,side*half*.97,roofY(.97)-.16,v,.071,8);
      }
      // Actual snow crest and sculpted lip at three ridge lines.
      for(const j of [0,1]){
        const t=j===0?.92:1;
        WR(w,j===0?'gold':'goldLight',side*half*t,roofY(t)-.08,v0,
           side*half*t,roofY(t)-.08,v1,.043,8);
      }
      WR(w,'snow',side*half*.97,roofY(.97)+.06,v0+.09,
         side*half*.97,roofY(.97)+.06,v1-.10,.065,6);

      // Raised ceramic/ice shingle facets with tiny ridges, not flat roof image.
      // 3 rows per slope * 15 columns * 2 slopes * 3 wings.
      for(let row=0;row<3;row++){
        const t=.18+row*.235;
        for(let j=0;j<15;j++){
          const a=v0+.19+j*(v1-v0-.33)/15;
          const b=a+(v1-v0-.33)/15*.90;
          const tA=t-.065,tB=t+.065;
          const mid=(a+b)*.5,eps=.035;
          const p0=WP(w,side*half*tA,roofY(tA)+eps,a);
          const p1=WP(w,side*half*tB,roofY(tB)+eps,a);
          const p2=WP(w,side*half*tB,roofY(tB)+eps,b);
          const p3=WP(w,side*half*tA,roofY(tA)+eps,b);
          const pt=WP(w,side*half*t,roofY(t)+eps+.038,mid);
          meshTriangles((row+j+idx)%6===0?'roofFacet':'tealTrim',
            [p0,p1,pt,p1,p2,pt,p2,p3,pt,p3,p0,pt]);
        }
      }
    }
    WR(w,'goldLight',0,4.20,v0,0,4.20,v1,.079,10);
    WR(w,'snow',0,4.27,v0+.02,0,4.27,v1-.12,.058,8);
    for(const v of [v0,v1]){
      for(const side of [-1,1]){
        WR(w,'goldLight',0,4.16,v,side*half,roofY(1),v,.052,8);
      }
    }
    // Finite gable-end pendant supports on both sides of each roof.
    for(const v of [v0+.18,v1-.19]){
      for(const s of [-1,1]){
        const p=WP(w,s*(w.width*.5+.07),3.15,v);
        facet('gold',.09,.16,.10,p[0],p[1],p[2]);
      }
    }
  }
  wings.forEach(wingRoof);

  // CENTRAL ROOF: OCTAGONAL BROAD FACETED CANOPY, NOT A CONE.
  const rOuter=2.11,rMid=1.35,rInner=.93;
  const C=(rad,angle,y) => [rad*Math.cos(angle),y,hubZ+rad*Math.sin(angle)];
  for(let i=0;i<8;i++){
    const a=(22.5+i*45)*Math.PI/180,b=(22.5+(i+1)*45)*Math.PI/180;
    const n=5;
    for(let j=0;j<n;j++){
      const x=a+(b-a)*j/n,x2=a+(b-a)*(j+1)/n;
      quad(j%3?'roof':'roofFacet',C(rOuter,x,3.60),C(rOuter,x2,3.60),
           C(rMid,x2,4.27),C(rMid,x,4.27));
      quad('roofFacet',C(rMid,x,4.27),C(rMid,x2,4.27),
           C(rInner,x2,4.62),C(rInner,x,4.62));
      quad('teal',C(rOuter,x,3.45),C(rOuter,x2,3.45),
           C(rInner,x2,4.48),C(rInner,x,4.48));
      // Raised facet seam in roof, radial geometry with a fine gold rib.
      if(j===0) rod('gold',C(rOuter,x,3.68),C(rInner,x,4.67),.035,6);
    }
    const mid=(a+b)/2;
    const pa=C(rOuter,a,3.63),pb=C(rOuter,b,3.63);
    rod('goldLight',pa,pb,.073,8);
    rod('snow',C(rOuter-.08,a,3.70),C(rOuter-.08,b,3.70),.055,8);
    // Abundant upward-facing snow specifically on lantern ledges.
    quad('snow',C(1.94,a,3.76),C(1.94,b,3.76),C(1.69,b,3.88),C(1.69,a,3.88));
    // Under-eave brackets are visible from the three concave junctions.
    for(const ratio of [.25,.75]){
      const t=a+(b-a)*ratio;
      rod('tealTrim',C(1.67,t,3.25),C(2.06,t,3.50),.066,8);
    }
  }

  // Central lantern with eight warm glazed faces, framing mullions,
  // octagonal plinth, octagonal hipped cap, and robust finial.
  function octagon(radius){
    return Array.from({length:8},(_,i)=>{
      const a=(22.5+i*45)*Math.PI/180; return [radius*Math.cos(a),hubZ+radius*Math.sin(a)];
    });
  }
  prismXZ('teal',octagon(.91),4.43,4.62);
  prismXZ('gold',octagon(.95),4.61,4.70);
  prismXZ('teal',octagon(.86),5.52,5.65);
  for(let i=0;i<8;i++){
    const a=(22.5+i*45)*Math.PI/180,b=(22.5+(i+1)*45)*Math.PI/180;
    const ap=C(.77,a,4.77),bp=C(.77,b,4.77);
    const at=C(.77,a,5.45),bt=C(.77,b,5.45);
    quad('glow',ap,bp,bt,at);
    // Narrow translucent facing in front of warm glazing.
    quad('glass',C(.79,a,4.78),C(.79,b,4.78),C(.79,b,5.42),C(.79,a,5.42));
    rod('goldLight',ap,at,.056,8);
    rod('goldLight',bp,bt,.056,8);
    rod('tealTrim',C(.80,a,5.09),C(.80,b,5.09),.029,6);
    const m=(a+b)/2;
    rod('gold',C(.78,m,4.82),C(.78,m,5.42),.025,6);
  }
  for(let i=0;i<8;i++){
    const a=(22.5+i*45)*Math.PI/180,b=(22.5+(i+1)*45)*Math.PI/180;
    quad('roof',C(.99,a,5.61),C(.99,b,5.61),C(.19,b,6.12),C(.19,a,6.12));
    quad('snow',C(.95,a,5.71),C(.95,b,5.71),C(.62,b,5.90),C(.62,a,5.90));
    rod('goldLight',C(.99,a,5.62),C(.19,a,6.14),.042,8);
    rod('gold',C(.99,a,5.62),C(.99,b,5.62),.064,8);
  }
  cyl('tealTrim',.19,.17,0,6.15,hubZ,12);
  facet('goldLight',.16,.24,.16,0,6.38,hubZ);

  // Decorative modular 8-sided collar in central chamber, dramatic from above.
  for(let i=0;i<8;i++){
    const a=(22.5+i*45)*Math.PI/180,b=(22.5+(i+1)*45)*Math.PI/180;
    rod('gold',C(1.18,a,4.24),C(1.18,b,4.24),.048,8);
    for(const t of [.2,.5,.8]){
      const aa=a+(b-a)*t;
      facet('goldLight',.075,.035,.075,...C(1.18,aa,4.31));
    }
  }

  // Porch columns: warm lanterns and half-length fluted stone drums.
  function pillar(x,z,base=.25,height=2.31) {
    cyl('shadow',base*1.47,.18,x,.35,z,12);
    cyl('pale',base*1.10,.18,x,.52,z,12);
    const g=new THREE.CylinderGeometry(base*.74,base*.80,height,16,1);
    bake(g,'stone',x,.60+height/2,z);g.dispose();
    // Thin vertical channels are dimensional gold/teal slivers, not a decal.
    for(let i=0;i<8;i++){
      const t=i*Math.PI/4;
      box('shadow',.025,height-.21,.034,x+Math.cos(t)*base*.79,.60+height/2,z+Math.sin(t)*base*.79,-t);
    }
    cyl('pale',base*1.22,.15,x,.64+height,z,12);
    cyl('teal',base*1.27,.12,x,.79+height,z,12);
    cyl('gold',base*1.17,.055,x,.86+height,z,12);
  }
  for(const x of [-1.18,1.18]) pillar(x,3.52,.16,2.16);
  for(const a of [45,135,270]){
    const rad=a*Math.PI/180;
    pillar(Math.cos(rad)*1.66,hubZ+Math.sin(rad)*1.66,.13,2.18);
  }
  // Concave re-entrant corners must have visible structure when walking inward.
  for(const s of [-1,1]){
    pillar(s*1.38,-1.26,.13,2.12);
    rod('tealTrim',[s*1.38,2.93,-1.26],[s*1.76,3.48,-1.36],.083,10);
    rod('gold',[s*1.38,2.91,-1.26],[s*1.64,3.43,-1.32],.028,6);
    box('snow',.42,.055,.37,s*1.43,3.15,-1.27);
  }

  // Entrance: three LINKED medallions sit on an actual bronze relief panel.
  box('teal',2.1,.42,.13,0,2.82,3.79);
  box('gold',2.0,.33,.045,0,2.84,3.882);
  box('teal',1.93,.29,.055,0,2.84,3.925);
  for(let i=-1;i<=1;i++){
    const x=i*.39;
    const torus=new THREE.TorusGeometry(.205,.039,7,20);
    bake(torus,'goldLight',x,2.84,3.945);torus.dispose();
    facet('gold',.075,.075,.032,x,2.84,3.954);
  }
  for(let i=-1;i<=0;i++){
    rod('goldLight',[i*.39+.20,2.84,3.964],[(i+1)*.39-.20,2.84,3.964],.028,6);
  }
  // Three caps above the council porch medallions.
  for(const x of [-.39,0,.39]) box('snow',.16,.029,.18,x,3.08,3.89);

  // Two hanging lanterns with real cages and warm inner cores, not point lights.
  function lantern(x,z) {
    rod('teal',[x,3.18,z],[x,2.38,z],.051,8);
    cyl('gold',.21,.055,x,2.48,z,8);
    cyl('tealTrim',.24,.075,x,2.28,z,8);
    const bg=new THREE.CylinderGeometry(.125,.15,.43,8,1);
    bake(bg,'glow',x,2.00,z);bg.dispose();
    facet('ember',.085,.19,.085,x,2.01,z);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      rod('gold',[x+Math.sin(a)*.19,1.78,z+Math.cos(a)*.19],
                 [x+Math.sin(a)*.19,2.26,z+Math.cos(a)*.19],.022,6);
    }
    cyl('goldLight',.22,.049,x,1.77,z,8);
    facet('gold',.095,.12,.095,x,2.50,z);
  }
  lantern(-1.18,3.76);
  lantern( 1.18,3.76);

  // Snow catches on front lintel, window sills, and all three wing ends.
  for(const w of wings){
    for(const side of [-1,1]){
      const p=WP(w,side*w.width*.5,3.19,w.length-.13);
      facet('snow',.25,.055,.23,p[0],p[1],p[2]);
    }
  }
  box('snow',2.24,.059,.25,0,2.71,3.80);

  // Removable sign (two baked meshes; completely optional for host).
  // A simple original geometric stroke alphabet avoids external fonts/textures.
  const G={
    S:[[[.84,1],[.16,1],[.1,.79],[.75,.50],[.84,.23],[.72,0],[.12,0]]],
    A:[[[.08,0],[.50,1],[.92,0]],[[.23,.40],[.77,.40]]],
    N:[[[.10,0],[.10,1],[.90,0],[.90,1]]],
    Y:[[[.07,1],[.50,.53],[.93,1]],[[.50,.53],[.50,0]]],
    O:[[[.24,0],[.76,0],[.91,.22],[.91,.78],[.76,1],[.24,1],[.09,.78],[.09,.22],[.24,0]]],
    U:[[[.10,1],[.10,.22],[.26,0],[.74,0],[.90,.22],[.90,1]]],
    Q:[[[.25,0],[.75,0],[.92,.20],[.92,.78],[.76,1],[.24,1],[.08,.78],[.08,.22],[.25,0]],[[.58,.23],[.99,-.13]]],
    I:[[[.22,1],[.78,1]],[[.50,1],[.50,0]],[[.22,0],[.78,0]]]
  };
  // All sign geometry uses the extra sign buckets, separate from the main hall.
  box('teal',2.14,.39,.09,0,3.42,3.80,0,true);
  box('gold',2.20,.47,.055,0,3.42,3.785,0,true);
  box('teal',2.08,.35,.072,0,3.42,3.83,0,true);
  const label='SAN YOU QI';
  const cell=.166,total=label.length*cell;
  for(let i=0;i<label.length;i++){
    const glyph=G[label[i]];
    if(!glyph) continue;
    for(const path of glyph){
      for(let j=0;j<path.length-1;j++){
        const p=path[j],q=path[j+1];
        const xx=i*cell-total/2+.02;
        rod('goldLight',
          [xx+p[0]*.133,3.318+p[1]*.205,3.900],
          [xx+q[0]*.133,3.318+q[1]*.205,3.900],.010,6,true);
      }
    }
  }

  // The host receives four marker objects attached directly to root.
  const anchors = {};
  function anchor(name, x,y,z) {
    const a = new THREE.Object3D();
    a.name = name; a.position.set(x,y,z);
    root.add(a); anchors[name]=a;
  }
  anchor('door',0,0,3.76);
  anchor('sign',0,3.42,3.87);
  anchor('leftLantern',-1.18,2.0,3.76);
  anchor('rightLantern',1.18,2.0,3.76);

  // Deliberately no wall around a roof overhang. Boxes approximate structural
  // walls only, asset-local; doorway centre x +/-0.91 is always unobstructed.
  const colliders=[];
  function collision(name,x,y,z,sx,sy,sz){
    colliders.push({name, center:[x,y,z], size:[sx,sy,sz]});
  }
  for(const side of [-1,1]){
    collision(`front_side_${side}`,side*1.30,1.51,2.20,.20,3.02,3.12);
    collision(`door_jamb_${side}`,side*1.16,1.24,3.69,.34,2.5,.32);
  }
  // Rear wall/corner AABBs closely follow each diagonal wall in ~0.5m slices.
  for(const w of [rearL,rearR]){
    for(const side of [-1,1]){
      for(let j=0;j<6;j++){
        const p=WP(w,side*w.width*.5,1.55,(j+.5)*w.length/6);
        collision(`${w.name}_${side}_${j}`,p[0],1.55,p[2],.45,3.08,.45);
      }
    }
    const p=WP(w,0,1.55,w.length);
    collision(`${w.name}_end`,p[0],1.55,p[2],.9,3.08,.9);
  }
  // Five occupied hub sides. Omitted faces are REAL junction entrances.
  for(let i=0;i<8;i++){
    const a=oct[i],b=oct[(i+1)%8];
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const angle=(Math.atan2(z-hubZ,x)*180/Math.PI+360)%360;
    if([90,225,315].some(v=>Math.abs(angle-v)<4)) continue;
    collision(`hub_wall_${i}`,x,1.62,z,
      Math.abs(a[0]-b[0])+.15,2.99,Math.abs(a[1]-b[1])+.15);
  }

  // Convert all independent sculpted features into a small number of draw calls.
  const worldCounts = finalize(buckets, root);
  const signCounts = finalize(signBuckets, SIGN);
  baseBox.dispose();baseCylinder.dispose();baseSphere.dispose();
  root.userData.metrics = {
    staticTriangles:worldCounts.triangles+signCounts.triangles,
    visibleMaterialDrawCalls:worldCounts.drawCalls+signCounts.drawCalls,
    drawCallsWithoutSign:worldCounts.drawCalls,
    source:'Counts from generated baked BufferGeometry, not a device benchmark'
  };
  root.userData.assetVersion='DRAFT-0.1.0';
  root.userData.approxFootprintMetres=[9,8];
  root.userData.signGroupName=SIGN.name;
  return {root,colliders,anchors};
}
