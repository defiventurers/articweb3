import React from 'react';
import {asset} from './games.ts';
import {HALL_ART} from './celebration.js';

// Card scenes include a sculpted table, board and raised pieces in one perspective.
// Learning previews retain canonical geometry; illustrations never define rules.
export function CoverArt({id,boardPreview=false,celebration=false}){
  if(!boardPreview&&HALL_ART[id])return <span className={`cover-art cover-${id} tabletop-cover${celebration?' celebration-cover':''}`} aria-hidden="true"><img className="cover-hero" src={HALL_ART[id].card} width="1200" height="800" alt="" loading="lazy" decoding="async"/></span>;
  return <span className={`cover-art cover-${id}`} aria-hidden="true">
    {boardPreview?<><img className="cover-scene" src={asset(`covers/${id}-scene-v1.webp`)} alt="" loading="lazy" decoding="async"/><img className="cover-board" src={asset(`covers/${id}-board-v1.webp`)} alt="" loading="lazy" decoding="async"/></>:<img className="cover-hero" src={asset(`covers/${id}-card-v2.webp`)} alt="" loading="lazy" decoding="async"/>}
  </span>;
}
