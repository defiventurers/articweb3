#!/usr/bin/env python3
"""Recreate the 27 lossless sprites from art/sanyou-gold-v2/source-sheet.png.
Requires Pillow, NumPy and SciPy. Existing generated sprites are replaced.
The normal web/APK build uses the checked-in sprites and needs no Python imaging packages.
"""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np,json,hashlib,shutil
M=Path(__file__).resolve().parents[1];A=M.parents[1];S=M/'art/sanyou-gold-v2';P=A/'frontend/public/assets/heritage-arcade'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
sheet=Image.open(S/'source-sheet.png').convert('RGBA');roles=['general','guard','soldier','flag','fire','elephant','horse','chariot','cannon']
prov={'sourceSheet':'142585.png','sourceSheetSha256':sha(S/'source-sheet.png'),'imagePixels':[256,256],'imageConversion':'Cropped supplied transparent atlas; isolated coin silhouettes; proportionally resized; lossless WebP','pieces':[]}
for row,team in enumerate(['blue','green','red']):
 for col,role in enumerate(roles):
  cx=[95,281,467,653,838,1024,1209,1395,1580][col];cy=[230,453,676][row];box=(cx-97,cy-101,cx+98,cy+102)
  a=np.asarray(sheet.crop(box)).copy();labels,n=ndimage.label(a[:,:,3]>32);areas=np.bincount(labels.ravel());areas[0]=0
  mask=ndimage.binary_dilation(labels==areas.argmax(),iterations=1);yy,xx=np.indices(a.shape[:2]);radius=np.sqrt(((xx-97)/93.5)**2+((yy-101)/98)**2)
  a[:,:,3]=np.minimum(a[:,:,3],np.clip((1.015-radius)/.015,0,1)*255).astype('uint8');a[:,:,3]=np.where(mask & (radius<1.015),a[:,:,3],0)
  clean=Image.fromarray(a);clean=clean.crop(clean.getbbox());clean.thumbnail((250,250),Image.Resampling.LANCZOS);canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(clean,((256-clean.width)//2,(256-clean.height)//2))
  name=f'{team}_{role}.webp';canvas.save(S/name,'WEBP',lossless=True,method=6);dst=P/'tokens/sanyou-gold-v2'/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(S/name,dst)
  prov['pieces'].append({'team':team,'role':role,'file':name,'sourceCrop':box,'sha256':sha(S/name)})
put(S/'provenance.json',json.dumps(prov,indent=2)+'\n')

