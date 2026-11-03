import {useEffect,useState} from 'react';
import {GATHERING_KEY} from './gathering.js';
import {read,write} from './storage.js';
import {cloudSnapshot,watchCloud,measure} from './cloud.js';
import {PRODUCTS,PACK_ID,appearanceFor,ownsProduct} from './collectionModel.js';
export {PRODUCTS,productById} from './collectionModel.js';
export const PACK=PRODUCTS[0];
export const FOUNDER_OUTFITS={polly:'Welcome cape',pengu:'Navigator vest',retsba:'Expedition jacket',abster:'Discovery apron'};
export const COURT_OUTFITS={polly:'Blossom Lantern Cape',pengu:'Moon Scholar Robe',retsba:'Lantern Captain Coat',abster:'Jade Archive Robe'};
export const COLLECTION_PORTRAITS=Object.fromEntries(['polly','pengu','retsba','abster'].map(host=>[host,`art/collections/aurora/${host}.webp`]));
export function ownsCollection(state=cloudSnapshot(),id=PACK_ID){return ownsProduct(state.entitlements,id);}
export function useCollectionAppearance(){const[state,setState]=useState(cloudSnapshot),[revision,setRevision]=useState(0);useEffect(()=>watchCloud(setState),[]);useEffect(()=>{const change=e=>{if(!e.detail||['collection-appearance','companion-journey.v1','frozen-library.v1',GATHERING_KEY].includes(e.detail.key))setRevision(v=>v+1);};window.addEventListener('arctic-storage',change);window.addEventListener('arctic-cloud-progress',change);return()=>{window.removeEventListener('arctic-storage',change);window.removeEventListener('arctic-cloud-progress',change);};},[]);return{...appearanceFor(read('collection-appearance',{}),state.entitlements,read('frozen-library.v1',{}),read('companion-journey.v1',{}),read(GATHERING_KEY,{})),entitlements:state.entitlements,revision};}
export function equipCollection(host,enabled=true,product=PACK){if(!ownsCollection(cloudSnapshot(),product.id))return false;const choices=read('collection-appearance',{});write('collection-appearance',{...choices,outfits:{...choices.outfits,[host]:enabled?product.outfit:null},camp:enabled?product.scene:choices.camp,table:enabled?product.table:choices.table,...(product.id===PACK_ID?{frame:enabled?'aurora':choices.frame,badge:enabled}:{} )});if(enabled)measure('collection_equipped',null,product.id);return true;}
export function saveAppearance(value){const state=cloudSnapshot(),safe=appearanceFor(value,state.entitlements,read('frozen-library.v1',{}),read('companion-journey.v1',{}),read(GATHERING_KEY,{}));return write('collection-appearance',safe);}
export function savedCollections(){const saved=read('collection-shortlist',[]);return Array.isArray(saved)?PRODUCTS.filter(p=>saved.includes(p.id)).map(p=>p.id):[];}
export function toggleSaved(id){const saved=savedCollections(),next=saved.includes(id)?saved.filter(v=>v!==id):[...saved,id];write('collection-shortlist',next);measure(saved.includes(id)?'collection_unsaved':'collection_saved',null,id);return next;}
