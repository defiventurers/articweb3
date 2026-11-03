import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FairPlayPanel} from './FairPlayPanel.jsx';
function Page(){
 const [bundle,setBundle]=useState(null),[error,setError]=useState('');
 const token=new URLSearchParams(location.search).get('proof');
 useEffect(()=>{if(!token)return;if(!/^[A-Za-z0-9_-]{43}$/.test(token)){setError('This proof link is incomplete.');return;}const c=new AbortController();fetch('https://articweb3.onrender.com/arctic-play/v3/fair/public/'+token,{signal:c.signal}).then(async r=>{const value=await r.json();if(!r.ok)throw Error(value.error||'Proof unavailable');setBundle(value.bundle);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[token]);
 return <main className="fair-page"><a className="fair-page-brand" href="https://arcticdominion.xyz/">← Antarctic Kingdoms</a>{error&&<p className="fair-page-note">{error}</p>}<FairPlayPanel key={bundle?.headerHash||'import'} initialBundle={bundle} workerUrl="fair-worker.js"/><p className="fair-page-note">Verify imported evidence without signing in. <a href="https://articweb3.onrender.com/arctic-play/app/" style={{color:'#c6ebff'}}>Open the seven proof-enabled game halls ↗</a></p></main>;
}
createRoot(document.getElementById('root')).render(<Page/>);
