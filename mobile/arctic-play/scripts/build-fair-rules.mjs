import fs from 'node:fs/promises';
import path from 'node:path';
import {reproduceRulesAuthority} from '../../../shared/fair-play/reproduce-rules-authority.mjs';

// Preserve the existing caller API, but never overwrite a published authority
// during an app build. A future rules edition requires its own reviewed manifest.
export async function buildFairRules({root}) {
  const report=await reproduceRulesAuthority({root});
  if(!report.ok)throw Error('Published Fair Play authority failed read-only reconstruction: '+JSON.stringify(report));
  return JSON.parse(await fs.readFile(path.join(root,'shared/fair-play/rules-manifest.json'),'utf8'));
}
