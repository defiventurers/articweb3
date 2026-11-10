import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const mobile = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(mobile + '/build-deps/package.json'), { parse } = require('acorn'), { build } = await import(require.resolve('rolldown'));
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Supply verified v5.9.13 app.js and output path');
let source = await fs.readFile(input, 'utf8');
if (createHash('sha256').update(source).digest('hex') !== '45018e11037d9d0dcd40ac1b0dce8f7d1f3ad37e24a95efa655d069ea36becc7') throw Error('Expected delivered v5.9.13 runtime');
const ast = parse(source, { ecmaVersion: 'latest' }), found = {}, edits = [];
const prop = (node, key) => node?.type === 'ObjectExpression' ? node.properties.find(p => p.key?.name === key || p.key?.value === key)?.value : null;
const literal = node => node?.type === 'Literal' ? node.value : node?.type === 'TemplateLiteral' && !node.expressions.length ? node.quasis[0].value.cooked : null;
const raw = node => source.slice(node.start, node.end);
function visit(node, parents = []) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression') {
    const p = node.arguments[1];
    if (literal(prop(p, 'title')) === 'Your Antarctic Visa') found.sheet = { node, parents };
    if (literal(prop(p, 'children')) === 'My wallet & NFTs') found.oldButton = node;
    if (literal(prop(p, 'className')) === 'pp-book-caption') found.caption = node;
  }
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(n => visit(n, [...parents, node])); else if (value && typeof value === 'object') visit(value, [...parents, node]);
}
visit(ast);
if (!found.sheet || !found.oldButton || !found.caption) throw Error('Passport integration points missing');
const app = [...found.sheet.parents].reverse().find(n => n.type === 'FunctionDeclaration'), condition = [...found.sheet.parents].reverse().find(n => n.type === 'LogicalExpression' && n.right === found.sheet.node);
if (!app || condition?.left?.type !== 'BinaryExpression') throw Error('Wallet sheet host missing');
const sheetState = raw(condition.left.left), close = prop(found.sheet.node.arguments[1], 'onClose'), setter = raw(close.body.callee), sheet = raw(found.sheet.node.callee);
edits.push({ start: condition.end, end: condition.end, text: `,${sheetState}==='wallet'&&d.createElement(${raw(found.sheet.node.arguments[0])},{title:'Wallet',onClose:()=>${setter}(null),children:d.createElement(window.AKPassportWallet.PassportWallet)})` });
// Hooks remain unconditional, before the app's existing early returns.
edits.push({ start: app.body.start + 1, end: app.body.start + 1, text: `d.useEffect(()=>{const open=()=>${setter}('wallet');window.addEventListener('ak-open-wallet',open);return()=>window.removeEventListener('ak-open-wallet',open)},[]);` });
const click = prop(found.oldButton.arguments[1], 'onClick');
edits.push({ start: click.start, end: click.end, text: '()=>window.AKPassportWallet.openPassportWallet()' });
edits.push({ start: found.caption.end, end: found.caption.end, text: ',d.createElement(window.AKPassportWallet.WalletEntry)' });
for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
// This exact, hash-pinned release exposes the existing account module. Do not bundle a second session store.
if (!source.includes('let Dt=()=>({...Tt}),Ot=e=>(_t.add(e),()=>_t.delete(e))') || !source.includes('async function At(e,{method:')) throw Error('Cloud bridge does not match verified runtime');
const temp = path.join(mobile, 'build/passport-wallet.iife.js');
await fs.mkdir(path.dirname(temp), { recursive: true });
await build({ input: path.join(mobile, 'src/PassportWallet.jsx'), external: ['react', './cloud.js'], platform: 'browser', plugins: [{ name: 'css', load(id) { if (id.endsWith('.css')) return { code: '', moduleType: 'js' }; } }], transform: { jsx: { runtime: 'classic' }, target: 'es2020' }, output: { file: temp, name: 'AKPassportWallet', format: 'iife', globals: id => id === 'react' ? 'window.__AKReact' : id.endsWith('cloud.js') ? 'window.__AKWalletCloud' : (()=>{throw Error('Unexpected external '+id)})(), minify: true }, onwarn(w, next) { if (['UNRESOLVED_IMPORT', 'MISSING_GLOBAL_NAME'].includes(w.code)) throw Error(w.message); next(w); } });
const marker = ';(0,Gl.createRoot)(document.getElementById(`root`)).render(', at = source.lastIndexOf(marker);
if (at < 0) throw Error('App mount missing');
source = source.slice(0, at) + ';window.__AKWalletCloud={cloudRequest:At,cloudSnapshot:Dt,watchCloud:Ot};' + await fs.readFile(temp, 'utf8') + ';window.AKPassportWallet=AKPassportWallet;' + source.slice(at);
const version = 'versionName:`5.9.13`,versionCode:101';
if (source.split(version).length !== 2) throw Error('Version mismatch');
source = source.replace(version, 'versionName:`5.9.14`,versionCode:102');
parse(source, { ecmaVersion: 'latest' });
await fs.writeFile(output, source);
console.log(JSON.stringify({ passportEntry: true, inAppSheet: true, oldManageButtonReplaced: true, existingCloudSessionReused: true, bytes: source.length }));
