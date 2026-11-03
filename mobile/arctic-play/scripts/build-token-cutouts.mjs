import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {TOKEN_CUTOUTS} from '../src/tokenCutouts.js';

export async function buildTokenCutouts(mobile,destination){
 const sharp=createRequire(path.join(mobile,'build-deps/package.json'))('sharp');
 const target=path.join(destination,'art/tokens/cutouts');await fs.mkdir(target,{recursive:true});
 for(const[key,contour]of Object.entries(TOKEN_CUTOUTS)){
  // Lossless format conversion only; the original pixels are embedded intact.
  // SVG clipping supplies alpha consistently in WebView, HTML images and covers.
  const input=path.join(destination,`art/tokens/token-sanguo-${key}.webp`);
  const metadata=await sharp(input).metadata();if(metadata.width!==256||metadata.height!==256)throw new Error(`Unexpected token geometry: ${key}`);
  const png=(await sharp(input).png().toBuffer()).toString('base64');
  const[cx,cy,rx,ry]=contour.ellipse;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="256" height="256" viewBox="0 0 256 256"><defs><clipPath id="outline"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>${contour.extension?`<path d="${contour.extension}"/>`:''}</clipPath></defs><image xlink:href="data:image/png;base64,${png}" width="256" height="256" clip-path="url(#outline)"/></svg>`;
  await fs.writeFile(path.join(target,`token-sanguo-${key}.svg`),svg);
 }
}
