const model=require('../mobile/arctic-play/src/unlockModel.cjs');
const ACHIEVEMENTS=Object.freeze(['shogi','sannin','sanguo','sanyou','yanyi','xiangqi','dominion','co-tu-lenh','shanshui-xiangqi'].map((game,i)=>({code:game+'-first-win',game,tokenId:i+2,title:'First '+({shogi:'Shogi',sannin:'Sannin Shogi',sanguo:'Sanguo Qi',sanyou:'San You Qi',yanyi:'Sanguo Yan Yi Qi',xiangqi:'Xiangqi',dominion:'Chaturanga','co-tu-lenh':'Cờ Tư Lệnh','shanshui-xiangqi':'Shanshui Xiangqi'})[game]+' Win'})));
function earnedAchievements(account){const p=model.clean(account?.accessProgress);return ACHIEVEMENTS.filter(a=>p.wins[a.game]||['co-tu-lenh','shanshui-xiangqi'].includes(a.game)&&account?.verifiedSupplementalWins?.[a.game]);}
module.exports={ACHIEVEMENTS,earnedAchievements};
