// Immutable, separately published rules authorities. Never use the gameplay bundle
// as an implicit fallback for an unknown proof edition.
import legacy from './legacy/arcticPlayEngine.cjs';
import legacyManifest from './legacy/rules-manifest.json' with {type:'json'};
import launch from './rulesets/launch-2026-11/engine.cjs';
import launchManifest from './rulesets/launch-2026-11/manifest.json' with {type:'json'};

export const RULESETS=Object.freeze([
 {id:'legacy-2026',engine:legacy,manifest:legacyManifest},
 {id:'launch-2026-11',engine:launch,manifest:launchManifest}
]);
const commanderProfiles=['youtuber_rules','ancientchess_2015_standard','ancientchess_2015_long','creator_2024_standard','bga_2024','commander','division'];
export function selectRuleset(header){
 const authority=RULESETS.find(a=>a.manifest.rulesHash===header?.rulesHash);
 if(!authority||header.protocol!=='ak-fair-play-v1')throw Error('This match needs its original published rules build. Keep the proof for a compatible verifier.');
 if(!authority.engine.game(header.gameId)||header.rulesVersion!==authority.engine.VERSION)throw Error('This game or rules version is not supported by this proof edition.');
 const options=header.options||{},profile=options.rulesProfile;
 if(profile!=null){
  const supported=authority.id==='launch-2026-11'&&(
   header.gameId==='dominion'&&profile==='chaturanga-long-dice-v1'||
   header.gameId==='co-tu-lenh'&&commanderProfiles.includes(profile));
  if(!supported)throw Error('This rules profile is not supported by this proof edition.');
 }
 if(options.teamMode!=null&&!['2v2','free-for-all'].includes(options.teamMode))throw Error('Unsupported team mode in match proof.');
 return authority;
}
