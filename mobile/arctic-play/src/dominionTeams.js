// Fixed alliances for this clearly labelled modern Chaturanga variant.
// Opposite kingdoms share victory; each player keeps their own army and turn.
export const TEAM_CAPABILITY='dominion-teams-v1';
export const DOMINION_TEAMS=Object.freeze([
  Object.freeze({id:'green-pink',name:'Green + Pink',seats:Object.freeze(['green','yellow'])}),
  Object.freeze({id:'red-blue',name:'Red + Blue',seats:Object.freeze(['red','blue'])}),
]);
export const teamFor=seat=>DOMINION_TEAMS.find(team=>team.seats.includes(seat));
export const teamName=seat=>teamFor(seat)?.name||seat;
export const teammates=(a,b)=>!!teamFor(a)&&teamFor(a)===teamFor(b);
export const teamGame=state=>state?.teamMode==='2v2';

export const DOMINION_TEAM_RULES='This is a modern Chaturanga team variant. Green + Pink face Red + Blue, with opposite kingdoms as partners. The room creator chooses an alliance and their kingdom before creating the table. Each player moves only their own army on the existing turn order. Teammates block movement like friendly pieces and cannot capture one another. Capture both opposing royal Frost Kings to win as a team; an eliminated partner shares the team victory. Empty seats can be filled with bots. The original four-way mode remains available.';
