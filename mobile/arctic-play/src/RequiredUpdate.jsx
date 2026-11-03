import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Download,Moon,Sun,RotateCcw,Shield} from 'lucide-react';
import {installedVersion,fetchLatestRelease,validateRelease,openReleaseDownload} from './updates.js';
import {read,write} from './storage.js';
const CACHE='required-release';
function cachedRelease(){try{return validateRelease(read(CACHE,null));}catch{return null;}}

export function useRequiredUpdate(){
  const [installed]=useState(installedVersion),[release,setRelease]=useState(cachedRelease);
  const [checking,setChecking]=useState(false),[error,setError]=useState('');
  const native=!!globalThis.window?.Android,known=useRef(release),request=useRef(null);
  const accept=useCallback(value=>{
    const latest=validateRelease(value);
    if(latest.versionCode===installed.versionCode&&latest.versionName!==installed.versionName)throw Error('The update information does not match this version. Please retry.');
    // A stale or rolled-back response cannot unlock a previously required update.
    if(!known.current||latest.versionCode>known.current.versionCode){known.current=latest;setRelease(latest);write(CACHE,latest);}
    return latest;
  },[installed.versionCode,installed.versionName]);
  const check=useCallback(async()=>{
    if(!native)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setChecking(true);setError('');
    try{const latest=await fetchLatestRelease({signal:controller.signal});if(!controller.signal.aborted)accept(latest);}
    catch(failure){if(!controller.signal.aborted)setError(failure.message);}
    finally{if(request.current===controller){setChecking(false);request.current=null;}}
  },[native,accept]);
  useEffect(()=>{
    if(!native)return;
    check();const visible=()=>{if(document.visibilityState!=='hidden')check();};
    window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);
    const timer=setInterval(visible,5*60*1000);
    return()=>{request.current?.abort();clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};
  },[native,check]);
  return {installed,release,checking,error,check,accept,required:native&&!!release&&release.versionCode>installed.versionCode};
}

export function HeaderControls({theme,onTheme,onUpdates,checking=false,required=false}){return <div className="header-controls">
  <button type="button" className="icon-btn header-theme" role="switch" aria-label="Night mode" aria-checked={theme==='dark'} onClick={onTheme} title={theme==='dark'?'Switch to daylight':'Switch to night mode'}>{theme==='dark'?<Moon size={20}/>:<Sun size={20}/>}</button>
  <button type="button" className={'icon-btn header-update '+(required?'update-needed':'')} aria-label="App updates" onClick={onUpdates} title="Check for updates">{checking?<RotateCcw size={20}/>:<Download size={20}/>}</button>
</div>;}

export function RequiredUpdate({update,theme,onTheme}){
  const {release,installed,check,checking,error}=update;
  const [opened,setOpened]=useState(false),[downloadError,setDownloadError]=useState('');const panel=useRef(null);
  useEffect(()=>{panel.current?.focus({preventScroll:true});const stop=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}};window.addEventListener('keydown',stop,true);return()=>window.removeEventListener('keydown',stop,true);},[]);
  function download(){try{openReleaseDownload(release,installed);setOpened(true);setDownloadError('');}catch(e){setDownloadError(e.message);}}
  return <div className="app required-update-page"><header className="required-update-header"><strong>Antarctic Kingdoms</strong><HeaderControls theme={theme} onTheme={onTheme} onUpdates={check} checking={checking} required/></header>
    <section className="required-update-panel" ref={panel} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="required-update-title" aria-describedby="required-update-description">
      <span className="required-update-emblem"><Download size={32}/></span><p className="world-eyebrow">A NEW VERSION IS READY</p><h1 id="required-update-title">Update to continue</h1>
      <p id="required-update-description">Install Antarctic Kingdoms {release.versionName} to return to your games.</p><dl className="update-details"><div><dt>Installed</dt><dd>{installed.versionName}</dd></div><div><dt>Required</dt><dd>{release.versionName}</dd></div></dl>
      <button className="primary full" onClick={download}><Download size={20}/>Download update</button>
      {opened&&<p className="update-download-note" role="status">When the download finishes, open the APK and tap Update. Reopen the updated app to continue.</p>}
      {(downloadError||error)&&<p className="update-error" role="alert">{downloadError||error}</p>}
      <button className="secondary full update-check" disabled={checking} onClick={check}><RotateCcw size={18}/>{checking?'Checking…':'Check again'}</button>
      <p className="update-install-help"><Shield size={18}/><span>Your profile, saved seats and practice games stay on this phone.</span></p>
      {!!release.releaseNotes.length&&<section className="update-notes"><h3>What’s new</h3><ul>{release.releaseNotes.map(note=><li key={note}>{note}</li>)}</ul></section>}
    </section></div>;
}

export function BrowserUpdates(){return <div className="app-updates"><div className="update-status"><h3>Refresh your browser game</h3><p>Load the newest published game and artwork.</p></div><button className="primary full" onClick={()=>location.reload()}><RotateCcw size={19}/>Refresh game</button></div>;}
