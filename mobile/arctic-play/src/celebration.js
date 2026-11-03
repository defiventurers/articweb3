// Illustration and friendly chat only. Never an authority for game rules.
const root='art/celebration/';
export const CELEBRATION_ART={
  home:root+'scenes/lantern-harbor-festival.webp',
  friends:root+'scenes/festival-friends.webp',
  passport:root+'scenes/lantern-passport.webp',
  finale:root+'scenes/eighth-lantern-celebration.webp',
};
export const HALL_ART=Object.fromEntries(['xiangqi','shogi','sannin','sanguo','sanyou','yanyi','dominion'].map(id=>[id,{
  image:'art/tables-3d-v3/'+id+'.webp',
  card:'art/tables-3d-v3/'+id+'.webp',
}]));
const sticker=(id,host,label,gameId=null)=>({id:'festival-'+id,host,label,gameId,image:root+'stickers/'+id+'.webp'});
export const FESTIVAL_STICKERS=[
  sticker('polly-seat','polly','Saved you a seat!'),
  sticker('polly-second-chance','polly','Another chance!','shogi'),
  sticker('polly-four-clans','polly','Let’s roll!','dominion'),
  sticker('retsba-good-game','retsba','Good game!'),
  sticker('retsba-rematch','retsba','Rematch?'),
  sticker('retsba-changing-banners','retsba','New banner. New plan!','sanguo'),
  sticker('pengu-river','pengu','See you by the river!','xiangqi'),
  sticker('pengu-yellow-lantern','pengu','Follow the golden light.','yanyi'),
  sticker('pengu-well-played','pengu','Well played!'),
  sticker('abster-three-paths','abster','Room for a third!','sannin'),
  sticker('abster-fire-flag','abster','A spark of strategy!','sanyou'),
  sticker('abster-eureka','abster','Found a clever move!'),
];
const names={polly:'Polly',retsba:'Retsba',pengu:'Pengu',abster:'Abster'};
// Ordinary readable text lets older app versions display the same message.
export function festivalStickerText(id){const s=FESTIVAL_STICKERS.find(item=>item.id===id);return s?`🎉 ${names[s.host]}: ${s.label}`:null;}
export function parseFestivalSticker(text){return typeof text==='string'?FESTIVAL_STICKERS.find(s=>festivalStickerText(s.id)===text)||null:null;}
export function hallSticker(id){return FESTIVAL_STICKERS.find(s=>s.gameId===id);}
