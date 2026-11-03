"""Cờ Tư Lệnh tabletop miniatures: exploratory one-piece watertight printable concept masters.

This produces no official, approved or heritage-authentic miniature assets. All units have a
26 mm base, discrete shapes with deliberately distinct silhouettes, and no unsupported mounts.
Requires numpy, scipy, skimage and trimesh. Use 0.55 mm SDF sampling for single watertight meshes.
"""
from pathlib import Path
import json
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes
import trimesh

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'miniatures';OUT.mkdir(exist_ok=True)
STEP=.55
X,Y,Z=np.mgrid[-15:15+STEP:STEP,-15:15+STEP:STEP,-2:40+STEP:STEP]

def cyl(cx,cy,zlo,zhi,r):
    radial=np.sqrt((X-cx)**2+(Y-cy)**2)-r
    return np.maximum.reduce([radial, zlo-Z,Z-zhi])
def sphere(cx,cy,cz,r):
    return np.sqrt((X-cx)**2+(Y-cy)**2+(Z-cz)**2)-r

def box(cx,cy,cz,dx,dy,dz):
    return np.maximum.reduce([abs(X-cx)-dx/2,abs(Y-cy)-dy/2,abs(Z-cz)-dz/2])
def rod(axis,a,b,c,d,r):
    if axis=='x': radial=np.sqrt((Y-b)**2+(Z-c)**2);long=np.maximum(a-X,X-d)
    elif axis=='y':radial=np.sqrt((X-a)**2+(Z-c)**2);long=np.maximum(b-Y,Y-d)
    else:radial=np.sqrt((X-a)**2+(Y-b)**2);long=np.maximum(c-Z,Z-d)
    return np.maximum(radial-r,long)

def assemble(kind):
    # Smooth single-material union from signed distance fields, model units in mm.
    d=np.minimum(cyl(0,0,.4,3.3,12.5),cyl(0,0,0,1.1,13.0))
    def add(shape):
        nonlocal d
        d=np.minimum(d,shape)
    # Repeatable tapered foundation visually ties the collection together.
    add(cyl(0,0,3.2,5,9.2))
    if kind=='commander':
        add(box(0,0,13,10,10,17));add(cyl(0,0,22,25,6))
        add(sphere(0,0,28,5));add(box(0,0,31,2.2,12,8));add(box(0,0,31,12,2.2,8))
    elif kind=='infantry':
        add(cyl(0,0,5,16,5));add(sphere(0,0,20,5.5));add(box(0,-2,25.3,12,8,2.2));
        add(box(-5,0,10,2.5,4,8));add(box(5,0,10,2.5,4,8))
    elif kind=='tank':
        add(box(0,0,10,20,13,10));add(cyl(0,0,15,20,5.4));add(rod('y',0,-12,17,-2,1.8));
        for x in [-7,0,7]:
            for y in [-6,6]:add(sphere(x,y,8,3.3))
    elif kind=='militia':
        add(cyl(0,0,5,17,4));add(sphere(0,0,20,4.8));add(rod('z',5,2,5,33,1.8));
        add(box(1,2,29.5,10,3.1,6))
    elif kind=='engineer':
        add(box(0,0,9,17,12,7));
        add(box(-6,0,17,3.5,12,15));add(box(6,0,17,3.5,12,15));add(box(0,0,25.5,17,13,3.2));
        for y in [-5,5]:add(box(0,y,21,15,2.8,3))
    elif kind=='artillery':
        add(box(0,0,10,16,12,8));add(rod('y',0,-12,15,0,3.7));add(cyl(0,0,13,18,5));
        for x in [-8,8]:add(sphere(x,0,10,4.2))
    elif kind=='antiair':
        add(box(0,0,10,15,12,7));add(cyl(0,0,14,19,4));
        for x in [-3,3]:add(rod('y',x,-12,24,0,1.9))
        add(box(0,0,23,9,7,4))
    elif kind=='missile':
        add(box(0,0,8,16,12,5));add(box(0,0,12,11,9,5));
        for x in [-3,3]:add(rod('z',x,0,13,32,2.7))
        add(box(0,0,29,11,6,3))
    elif kind=='aircraft':
        add(cyl(0,0,5,19,2.9));
        add(box(0,0,23,4,17,6));add(box(0,-1,23,23,5,3.5));
        add(box(0,6,26.5,9,5,3.5));add(box(0,7,29,3,3,6));
        add(sphere(0,-10,23,3.2))
    elif kind=='navy':
        add(box(0,0,10,9,22,8));add(box(0,0,13,12,18,4));add(box(0,3,18,7,8,7));
        add(cyl(0,-6,17,21,3.3));add(rod('y',0,-11,19,-6,1.5));
        add(box(0,8,16.5,9,5,3))
    elif kind=='headquarters':
        add(box(0,0,10,19,17,11));add(box(0,0,16.5,21,19,3));
        add(box(0,-9.2,11,7,4,8));add(box(0,0,20,10,5,4));
        add(box(-6,-9.2,15,3,4,3));add(box(6,-9.2,15,3,4,3))
    else:raise ValueError(kind)
    # Gaussian only rounds the SDF mildly; base stays flat with useful dimension.
    smooth=gaussian_filter(d, sigma=.40)
    v,f,_,_=marching_cubes(smooth,level=0,spacing=(STEP,STEP,STEP),allow_degenerate=False)
    mesh=trimesh.Trimesh(vertices=v+[-15,-15,-2],faces=f,process=True)
    mesh.remove_unreferenced_vertices()
    return mesh

units=['commander','infantry','tank','militia','engineer','artillery','antiair','missile','aircraft','navy','headquarters']
report=[]
for kind in units:
    mesh=assemble(kind)
    if not mesh.is_watertight:raise RuntimeError(kind+' is not watertight')
    mesh.export(OUT/(kind+'.stl'))
    item=dict(unit=kind,vertices=len(mesh.vertices),faces=len(mesh.faces),dimensions_mm=[round(float(n),2) for n in mesh.extents],watertight=bool(mesh.is_watertight),volume_mm3=round(float(mesh.volume),1),surface_area_mm2=round(float(mesh.area),1))
    report.append(item)
    for team,color in [('red',[225,65,72,255]),('blue',[34,120,211,255])]:
        preview=mesh.copy();preview.visual.face_colors=np.tile(color,(len(preview.faces),1));
        preview.export(OUT/(team+'-'+kind+'.glb'))
print(json.dumps(report,indent=2))
(OUT/'validation.json').write_text(json.dumps(report,indent=2))
(OUT/'README.md').write_text('''# Operation Frozen Front — Parametric 3D miniature concepts\n\nThese are **draft manufacturing candidates**, not approved final sculpts or source-authentic historical tokens. Each of the 11 STL masters represents one Vietnamese unit role on a common approximately 26 mm base. The 22 GLB previews illustrate red/blue painting variants; each STL is uncoloured, and can be printed in the required 38 physical quantities.\n\nGeometry is generated by `tools/build_miniatures.py` and voxel-unioned into watertight models. Units use stylized simplified silhouettes; details, fit tolerances, resin or FDM strength, support placement, visual quality and colour schemes have not undergone physical print tests.\n\nDimensions and water-tightness are in validation.json. Please inspect in a 3D slicer, check walls and raised barrels, and test-print before calling these production-ready.\n''')
