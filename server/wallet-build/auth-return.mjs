// Keep login tickets on the approved application surfaces.
export function isAllowedWalletReturn(value,origin){
 try{
  const u=new URL(value,origin);
  if(u.username||u.password||u.hash)return false;
  if(u.protocol==='arcticplay:'&&u.hostname==='auth'&&!u.port&&['','/'].includes(u.pathname))return true;
  if(u.origin===origin&&['/arctic-play/app/','/arctic-play/passport-check/'].includes(u.pathname))return true;
  return ['https://arcticdominion.xyz','https://www.arcticdominion.xyz'].includes(u.origin)&&['/','/play/'].includes(u.pathname);
 }catch{return false;}
}
