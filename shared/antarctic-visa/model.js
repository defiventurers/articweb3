export const VISA_VERSION = 1;
export const VISA_CHAIN = {id:11124,name:'Abstract Sepolia',explorer:'https://sepolia.abscan.org'};
export function playerName(value){
 const name=String(value||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim();
 if([...name].length<2||[...name].length>24)throw Error('Choose a player name with 2–24 characters.');
 return name;
}
export function addressShape(value){return /^0x[0-9a-fA-F]{40}$/.test(String(value||'').trim())&&!/^0x0{40}$/i.test(String(value||'').trim());}
export function shortWallet(value){return value?value.slice(0,6)+'…'+value.slice(-4):'Your EVM wallet';}
export function deliveryLabel(status){return ({awaiting_setup:'Waiting for delivery setup',queued:'Queued for delivery',sending:'Preparing delivery',submitted:'Transaction submitted',confirmed:'Delivered to your wallet',retry:'Delivery will retry',blocked:'Delivery needs attention'})[status]||'Not requested';}
