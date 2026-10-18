import React from 'react';
import {asset} from './games.ts';

// Lobby cards feature the game's actual key pieces. Learning previews retain
// canonical board geometry and existing sprites; card imagery never defines rules.
export function CoverArt({id,boardPreview=false}){
  return <span className={`cover-art cover-${id}`} aria-hidden="true">
    {boardPreview?<><img className="cover-scene" src={asset(`covers/${id}-scene-v1.webp`)} alt="" loading="lazy" decoding="async"/><img className="cover-board" src={asset(`covers/${id}-board-v1.webp`)} alt="" loading="lazy" decoding="async"/></>:<img className="cover-hero" src={asset(`covers/${id}-card-v2.webp`)} alt="" loading="lazy" decoding="async"/>}
  </span>;
}
