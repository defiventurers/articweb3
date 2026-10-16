import {GUIDES,GAME_HERITAGE} from './brand.js';
import {voiceLine} from './companionVoices.js';

export const COMPANION_KEY='companion-preferences';
export function companionPreferences(value){const input=value&&typeof value==='object'?value:{};return {guide:Object.hasOwn(GUIDES,input.guide)?input.guide:'auto',motion:input.motion!==false,comments:input.comments!==false,inGame:input.inGame!==false};}
export function companionId(preferences,gameId){return preferences.guide==='auto'?(GAME_HERITAGE[gameId]?.host||'polly'):preferences.guide;}
export const PERSONALITIES={
  polly:{trait:'The heart of the crew',signature:'One move. One new friend.',gesture:'Happy waddle',symbol:'♥'},
  retsba:{trait:'Bold mind. Kind heart.',signature:'Look. Plan. Make your move.',gesture:'Ready nod',symbol:'✦'},
  pengu:{trait:'Your calm wayfinder',signature:'Every path begins with a rule.',gesture:'Thoughtful bow',symbol:'✧'},
  abster:{trait:'A curious little problem-solver',signature:'What if we try another way?',gesture:'Curious tilt',symbol:'✿'},
};
// Authored offline reactions acknowledge accepted events, without rating a move
// or claiming that the mascot has calculated a position.
const reactions={
  polly:{move:['One more move in your story!','Little steps count. What changed that time?'],capture:['A capture changes the board. Give yourself a moment to look.'],discovery:['Your first guided move! A new page in our Archive.'],undo:['Of course we can try again. That’s what practice is for.'],restart:['Fresh board, fresh start. I’m staying right here.'],finish:['A whole game explored. A flipper high-five for everyone!'],draw:['A shared finish. Thank you for the game, both sides!'],dice:['Dice rolled! Now see which pieces they activate.']},
  retsba:{move:['Move accepted. Read the formation again.','New position. New possibilities.'],capture:['Capture confirmed. Pause and scan the new formation.'],discovery:['First move completed. Your exploration has begun!'],undo:['Reset the position. Explore a different plan.'],restart:['New formation. Let’s approach it with fresh eyes.'],finish:['Game complete. Respect to every player at the table.'],draw:['A drawn game still has plenty to learn from.'],dice:['Dice are in. Check your available activations.']},
  pengu:{move:['A legal step along the path.','The position has changed. Take a quiet look.'],capture:['The capture is complete. Check how the available paths changed.'],discovery:['A first move understood. One more path in your Archive.'],undo:['Back one step. The path is yours to explore again.'],restart:['We begin again, with a little more understanding.'],finish:['Our game has reached its conclusion. Thank you for exploring.'],draw:['A draw. Another kind of ending to understand.'],dice:['Each die permits an activation. Read the available moves.']},
  abster:{move:['Ooh, the pattern changed. What do you notice?','One possibility explored. Now for the next question.'],capture:['A space opened up. How does the pattern look now?'],discovery:['A new discovery! Your Archive is growing, one idea at a time.'],undo:['Another possibility! That’s the joy of practice.'],restart:['A clean page for another idea. I like it.'],finish:['We explored a whole game. What would you try next time?'],draw:['A thoughtful finish. Every game leaves us a new question.'],dice:['Two dice, a few possibilities. Let’s have a look.']},
};
export function companionLine(hostId,kind='welcome',variant=0){
  const host=Object.hasOwn(GUIDES,hostId)?hostId:'polly',index=Number.isFinite(variant)?Math.trunc(variant):0;
  const lines=reactions[host][kind];
  if(lines)return lines[((index%lines.length)+lines.length)%lines.length];
  return voiceLine(host,kind==='tap'?'celebrate':kind==='tip'?'thought':'hello',index);
}
export function reactionFor({finished=false,draw=false,discovery=false,captured=false,moved=false,rolled=false}={}){if(finished)return draw?'draw':'finish';if(discovery)return 'discovery';if(captured)return 'capture';if(moved)return 'move';return rolled?'dice':null;}
export function reactionPriority(kind){return ['discovery','finish','draw'].includes(kind)?3:kind==='capture'?2:1;}
// Eyelids are vector overlays over the untouched reference portraits.
export const PORTRAITS={
  polly:{width:863,height:1075,face:'#ffffff',eyes:[[343,272,35,40],[583,272,34,39]],stroke:8},
  retsba:{width:250,height:250,face:'#ffffff',eyes:[[128,111,10,13],[187,111,9,13]],stroke:2.5},
  pengu:{width:554,height:554,face:'#fffff2',eyes:[[260,282,23,28],[403,280,21,27]],stroke:5},
  abster:{width:320,height:393,face:'#ffffff',eyes:[[117,147,11,15],[180,147,11,15]],stroke:3},
};
