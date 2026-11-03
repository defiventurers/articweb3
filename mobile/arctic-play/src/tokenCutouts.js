// Android presentation masks for legacy round medals whose raster backgrounds
// contain a checkerboard or a faint dark rectangle. Original raster art stays
// untouched; these SVG contours supply real transparency wherever it is used.
export const TOKEN_CUTOUTS={
 'blue-advisor':{ellipse:[128,131,105,104]},
 'blue-bannerman':{ellipse:[128,131,103,103]},
 'blue-cannon':{ellipse:[128,131,103,102]},
 'blue-chariot':{ellipse:[128,131,103,103]},
 'blue-elephant':{ellipse:[128,131,113,112]},
 'blue-horse':{ellipse:[128,131,103,103],extension:'M125 35 L129 25 L133 35 Z'},
 'red-advisor':{ellipse:[128,128.5,102,102.5]},
 'red-bannerman':{ellipse:[130,131,100,101],extension:'M148 52 L151 31 L155 24 L160 34 L157 49 L222 56 L208 172 L177 148 L149 165 Z'},
 'red-cannon':{ellipse:[128,129,102,102.5]},
 'red-chariot':{ellipse:[128,128,102,102]},
 'red-elephant':{ellipse:[128,128,107,107]},
 'red-general':{ellipse:[128,129,103,103],extension:'M121 35 L128 16 L140 35 Z'},
 'red-horse':{ellipse:[128,129,103,103],extension:'M123 41 L127 13 L130 10 L134 41 Z'},
};
export function tokenCutoutAsset(path){
 const match=/^tokens\/token-sanguo-(.+)\.webp$/.exec(path);
 return match&&TOKEN_CUTOUTS[match[1]]?`tokens/cutouts/token-sanguo-${match[1]}.svg`:path;
}
