import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {patchHeritage} from '../scripts/patch-heritage-v5915.mjs';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const React=require('react'),{createRoot}=require('react-dom/client'),{JSDOM}=require('jsdom'),{parse}=require('acorn');
const data=JSON.parse(fs.readFileSync(path.join(mobile,'src/heritageStories.json')));
const baseline=process.env.HERITAGE_BASELINE_APP;
function find(source,kind,name){
  const out=[];function visit(node){if(!node||typeof node!=='object')return;if(node.type===kind&&node.id?.name===name)out.push(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(visit);else visit(value);}}visit(parse(source,{ecmaVersion:'latest'}));assert.equal(out.length,1);return out[0];
}
test('all nine introductions distinguish selected editions and use a bounded source-linked story',()=>{
  assert.equal(Object.keys(data.games).length,9);
  for(const game of Object.values(data.games)){
    assert.ok(game.edition);assert.equal(game.screens.length,3);assert.ok(data.halls.some(hall=>hall.id===game.hall));
    for(const screen of game.screens)for(const key of screen.sourceIds){assert.ok(data.sources[key]);assert.match(data.sources[key].url,/^https:\/\//);}
  }
  assert.match(data.games.yanyi.edition,/Modern/);
  assert.match(data.games['co-tu-lenh'].edition,/review/);
});
test('shipped expedition integration, access callbacks and keyboard image entry',{skip:!baseline},async()=>{
  const original=fs.readFileSync(baseline,'utf8'),patched=patchHeritage(original).source;
  assert.throws(()=>patchHeritage(patched),/already applied/);
  assert.throws(()=>patchHeritage(original.replace('const chapter = EXPEDITION_CHAPTERS','const renamedChapter = EXPEDITION_CHAPTERS')),/differs/);
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://example.test/play/'});
  const previous={};for(const name of ['window','document','navigator','localStorage','CustomEvent','HTMLElement']){previous[name]=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name],writable:true});}
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  dom.window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
  dom.window.HTMLElement.prototype.scrollTo=function(){};
  const jsx=(type,props,key)=>React.createElement(type,key===undefined?props:{...props,key});
  const context=vm.createContext({d:React,__AKVisaH:React.createElement,x:{Fragment:React.Fragment,jsx,jsxs:jsx},window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,CustomEvent:dom.window.CustomEvent,setTimeout,Date,console});
  const variable=find(patched,'VariableDeclarator','AKAdventureUI');vm.runInContext('var AKAdventureUI='+patched.slice(variable.init.start,variable.init.end),context);
  const {GamesAdventure}=vm.runInContext('AKAdventureUI',context),node=dom.window.document.getElementById('root'),root=createRoot(node);
  const click=async button=>{assert.ok(button);await React.act(async()=>{button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));});};
  const button=text=>[...node.querySelectorAll('button')].find(el=>el.textContent===text);
  const calls=[];let props;
  try{
    for(const [storyId,story] of Object.entries(data.games)){
      const id=storyId==='shanshui-xiangqi'?'shanshui':storyId;
      props={catalogue:[{id,name:story.title,image:'art/covers/'+id+'.webp',legacy:false}],scope:'test-'+id,isOpen:()=>false,onPlay:gameId=>calls.push(['play',gameId]),onLearn:gameId=>calls.push(['learn',gameId]),onIntent:()=>{}};
      await React.act(async()=>root.render(React.createElement(GamesAdventure,{...props,key:id})));
      const hero=node.querySelector('.exp-hero[role=button]');assert.ok(hero);assert.equal(hero.tabIndex,0);
      await React.act(async()=>hero.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
      assert.ok(node.querySelector('.heritage-introduction'));
      assert.equal(node.querySelector('h2').textContent,story.screens[0].title);
      await click(button('Continue →'));assert.equal(node.querySelector('h2').textContent,story.screens[1].title);
      await click(button('Continue →'));assert.equal(node.querySelector('h2').textContent,story.screens[2].title);
      await click(button('Proceed to game →'));assert.deepEqual(calls.at(-1),['play',id]);
      assert.ok(node.querySelector('.exp-conquest'));assert.match(node.textContent,/Choose an unlock route/);
      await click(node.querySelector('.exp-hero'));
      await click(button('Skip to game →'));assert.deepEqual(calls.at(-1),['play',id]);
      await click(node.querySelector('.exp-hero'));
      await click(button('Learn the moves first'));assert.deepEqual(calls.at(-1),['learn',id]);
      await click(node.querySelector('.exp-hero'));
      await React.act(async()=>dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
      assert.ok(node.querySelector('.exp-hero'));
    }
    const catalogue=Object.entries(data.games).map(([id,story])=>({id:id==='shanshui-xiangqi'?'shanshui':id,name:story.title,image:'art/covers/'+id+'.webp',legacy:false,playerCounts:[2]}));
    await React.act(async()=>root.render(React.createElement(GamesAdventure,{...props,key:'halls',catalogue,isOpen:()=>true})));
    await click(button('Snow garden hall'));assert.match(node.querySelector('.exp-hero').textContent,/Shogi/);assert.match(node.querySelector('.exp-chapter').getAttribute('aria-label'),/of 2/);
    assert.equal(node.querySelector('.heritage-hall-background').getAttribute('src'),'art/launch-incremental/halls/japan.webp');
    assert.equal(node.querySelector('.heritage-hall-background').getAttribute('alt'),'');
    await click(node.querySelector('[aria-label="Next game"]'));assert.match(node.querySelector('.exp-hero').textContent,/Sannin Shogi/);
    for(const hall of data.halls.filter(item=>item.image)){
      await click(button(hall.title));
      assert.equal(node.querySelector('.heritage-hall-background').getAttribute('src'),hall.image);
      assert.equal(node.querySelector('.heritage-hall-note').dataset.hall,hall.id);
    }
    await click(button('All halls'));assert.match(node.querySelector('.exp-chapter').getAttribute('aria-label'),/of 9/);
    assert.equal(node.querySelector('.heritage-hall-background'),null);
    // The optional grid keeps its separate favorite/play controls while its large
    // image opens the same introduction rather than bypassing the callback.
    Object.assign(context,{PC:catalogue,LC:()=>catalogue,FC:['All']});
    for(const name of ['ll','el','Q','zC','dl','gl','$c','El'])context[name]=()=>React.createElement('span');
    for(const name of ['AKOriginalGamesGrid','BC']){const fn=find(patched,'FunctionDeclaration',name);vm.runInContext(patched.slice(fn.start,fn.end),context);}
    const Wrapper=vm.runInContext('BC',context);
    const favorites=[];
    await React.act(async()=>root.render(React.createElement(Wrapper,{...props,key:'grid',query:'',filter:'All',favorites:[],onFavorite:id=>favorites.push(id),onQuery:()=>{},onFilter:()=>{},onFocusHandled:()=>{},focusSearch:true,intent:'play',isOpen:()=>true})));
    const firstImage=node.querySelector('.market-card-art img[role=button]');assert.ok(firstImage);
    await click(firstImage);assert.ok(node.querySelector('.heritage-introduction'));
    await click(button('← Back to games'));assert.ok(node.querySelector('.discovery-game-grid'));
    await click(node.querySelector('.market-favorite'));assert.deepEqual(favorites,['dominion']);assert.equal(node.querySelector('.heritage-introduction'),null);
  }finally{
    await React.act(async()=>root.unmount());dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    for(const [name,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  }
});
