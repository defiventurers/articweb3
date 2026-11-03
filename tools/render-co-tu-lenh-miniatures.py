"""Render quick geometry contact sheet from watertight STL masters. For review only."""
from pathlib import Path
import trimesh, numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
root=Path(__file__).resolve().parent.parent
units=['commander','infantry','tank','militia','engineer','artillery','antiair','missile','aircraft','navy','headquarters']
fig=plt.figure(figsize=(16,12),facecolor='#0a1b33')
for i,kind in enumerate(units):
 ax=fig.add_subplot(3,4,i+1,projection='3d')
 mesh=trimesh.load_mesh(root/'miniatures'/f'{kind}.stl')
 tris=mesh.triangles
 coll=Poly3DCollection(tris,alpha=.97,linewidths=0)
 coll.set_facecolor('#53B9E4' if i%2==0 else '#F35B64')
 ax.add_collection3d(coll)
 ax.set_xlim(-15,15);ax.set_ylim(-15,15);ax.set_zlim(0,38)
 ax.set_box_aspect((1,1,1.2));ax.view_init(elev=23,azim=-60)
 ax.set_axis_off();ax.set_facecolor('#152942');ax.set_title(kind.upper(),color='white',y=.90,fontweight='bold',fontsize=12)
fig.text(.5,.975,'OPERATION FROZEN FRONT  |  11 ORIGINAL MINIATURE PROTOTYPES',ha='center',color='#e7fbff',fontsize=19,weight='bold')
fig.text(.5,.025,'CONCEPT SCULPTS — 26 mm base — red/blue colour previews are illustrative — NOT PRINT-TESTED',ha='center',color='#aac9db',fontsize=11)
fig.subplots_adjust(wspace=.02,hspace=.05,left=.02,right=.98,top=.94,bottom=.05)
fig.savefig(root/'miniatures-preview.png',dpi=100,facecolor=fig.get_facecolor())
print(root/'miniatures-preview.png')
