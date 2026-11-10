import React from 'react';
import {FairPlayPanel} from '../../../shared/fair-play/FairPlayPanel.jsx';
import {cloudRequest,cloudSnapshot} from './cloud.js';
import {GUIDES} from './brand.js';
export function FairPlayHub({room,session,client,onClose}) {
 return <><div className="intro-host fair-piko"><img src={GUIDES.pengu.image} alt="Piko, your rules and Fair Play guide"/><p><strong>Piko keeps the record clear.</strong><small>Check the moves and dice, then inspect any blockchain receipt. Pending stays pending until its receipt checks out.</small></p></div><FairPlayPanel practice={!room}
  loadCurrent={room?.fair?.available?async()=>{const r=await client.call('ap_fair_get',session);return r.bundle;}:null}
  loadHistory={cloudSnapshot().session?.session?()=>cloudRequest('/fair/matches'):null}
  loadMatch={id=>cloudRequest('/fair/matches/'+id)}
  shareMatch={cloudSnapshot().session?.session?id=>cloudRequest('/fair/matches/'+id+'/share',{method:'POST',data:{}}):null}
  assetBase={new URL('.',location.href).href} onClose={onClose}/></>;
}
