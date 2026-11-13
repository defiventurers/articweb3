import React from 'react';
// Decorative citizens, not playable pieces or representations of connected users.
// The four approved guides remain separate assets, unchanged.
const colours=['#426c88','#ba886b','#b0a2c6','#d1ab78','#7f9ba8','#ad8a99','#7a9e84','#b08ba9','#a3b6bf','#9eae8e'];
export function PenguinAudience({className=''}) {
 return <svg className={'penguin-audience '+className} viewBox="0 0 600 104" role="presentation" aria-hidden="true" focusable="false">
 <defs><linearGradient id="ak-audience-ice" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e3eef5" stopOpacity=".88"/><stop offset="1" stopColor="#c1d7e6" stopOpacity=".68"/></linearGradient></defs>
 <ellipse cx="300" cy="99" rx="286" ry="6" fill="#0c2948" opacity=".42"/>
 {colours.map((colour,i)=>{const x=34+i*58,y=18+(i%3)*7,s=.79+(i%4)*.07;
  return <g key={i} transform={'translate('+x+' '+y+') scale('+s+')'}>
   <ellipse cx="-12" cy="74" rx="10" ry="5" fill="#9c6b44"/><ellipse cx="13" cy="74" rx="10" ry="5" fill="#9c6b44"/>
   <ellipse cx="-21" cy="48" rx="9" ry="23" fill={colour} transform="rotate(-18 -21 48)"/>
   <ellipse cx="21" cy="48" rx="9" ry="23" fill={colour} transform="rotate(18 21 48)"/>
   <ellipse cx="0" cy="49" rx="26" ry="32" fill={colour} stroke="#d1dbe2" strokeOpacity=".58" strokeWidth="2"/>
   <ellipse cx="0" cy="54" rx="17" ry="22" fill="url(#ak-audience-ice)"/>
   <circle cx="0" cy="19" r="24" fill={colour}/><ellipse cx="0" cy="22" rx="17" ry="14" fill="#e4ebea"/>
   <circle cx="-8" cy="17" r="3" fill="#203045"/><circle cx="8" cy="17" r="3" fill="#203045"/>
   <path d="M-7 26 Q0 21 7 26 Q0 34 -7 26Z" fill="#d7a44d" stroke="#a67532" strokeWidth="1"/>
   <path d="M-18 3 Q0 -8 18 3" fill="none" stroke="#dfc27f" strokeWidth="3"/>
  </g>;
 })}
 </svg>;
}
