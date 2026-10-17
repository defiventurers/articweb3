import React,{useEffect,useState} from 'react';
import {Lightbulb} from 'lucide-react';
import {GUIDES} from './brand.js';
import {MascotPortrait} from './Companions.jsx';
import {GUIDE_TIPS} from './teaching.js';

export function TeachingHost({host,preferences,children,success=false,compact=false,tips=GUIDE_TIPS[host]}){
  const enabled=preferences.mode!=='off',guide=GUIDES[host];
  const [response,setResponse]=useState(''),[pulse,setPulse]=useState(0),[five,setFive]=useState(false);
  useEffect(()=>{setResponse('');setFive(false);},[host,success]);
  return <aside className={`teaching-host ${success?'success':''}`} style={{'--host':guide.color}} data-motion={preferences.motion?'on':'off'} aria-label={enabled?`${guide.name} guides you`:'Lesson instructions'}>
    {enabled&&<button className="mentor-touch" aria-label={compact&&!success?`Ask ${guide.name} for a tiny tip`:`Flipper five with ${guide.name}`} onClick={()=>{setPulse(p=>p+1);setFive(!compact||success);setResponse(compact&&!success?tips[pulse%tips.length]:'Flippers up! A little cheer for your curiosity.');}}><MascotPortrait host={host} mood={success||five?'celebrate':'listening'} pulse={pulse} large motion={preferences.mode==='lively'&&preferences.motion}/>{compact&&!success&&<small>tap for a tip</small>}</button>}
    <div><strong>{enabled?guide.name:success?'Nicely done':'One little idea'}<span>{success?'NICE LITTLE DISCOVERY':host==='pengu'?'ONE CLEAR STEP':host==='retsba'?'A FRIENDLY CHALLENGE':host==='abster'?'ROOM TO EXPLORE':'RIGHT HERE WITH YOU'}</span></strong><p>{children}</p>{enabled&&!compact&&<button className="mentor-tip" onClick={()=>{setFive(false);setPulse(p=>p+1);setResponse(tips[pulse%tips.length]);}}><Lightbulb size={13}/> A tiny tip</button>}{response&&enabled&&<p className="mentor-response" role="status" aria-live="polite">{response}</p>}</div>
  </aside>;
}
