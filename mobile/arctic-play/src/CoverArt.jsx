import React from 'react';
import {asset} from './games.ts';

// The board layer is generated from canonical geometry and existing artwork.
// Imagegen supplies scenery only, never rules or board topology.
export function CoverArt({id}){
  return <span className={`cover-art cover-${id}`} aria-hidden="true">
    <img className="cover-scene" src={asset(`covers/${id}-scene-v1.webp`)} alt="" loading="lazy" decoding="async"/>
    <img className="cover-board" src={asset(`covers/${id}-board-v1.webp`)} alt="" loading="lazy" decoding="async"/>
  </span>;
}
