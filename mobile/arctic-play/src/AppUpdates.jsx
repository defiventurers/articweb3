import React,{useEffect,useRef,useState} from 'react';
import {Check,Download,RotateCcw,WifiOff,Shield} from 'lucide-react';
import {fetchLatestRelease,installedVersion,releaseStatus,openReleaseDownload} from './updates.js';

export function AppUpdates(){
  const [installed]=useState(installedVersion);
  const [status,setStatus]=useState('checking'),[release,setRelease]=useState(null),[error,setError]=useState(''),[checkedAt,setCheckedAt]=useState(null),[downloadOpened,setDownloadOpened]=useState(false);
  const request=useRef(null);
  async function check(){
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setStatus('checking');setRelease(null);setError('');setDownloadOpened(false);
    try{
      const latest=await fetchLatestRelease({signal:controller.signal});
      if(controller.signal.aborted)return;
      if(latest.versionCode===installed.versionCode&&latest.versionName!==installed.versionName)throw new Error('The update information does not match this version. Please try again later.');
      setRelease(latest);setStatus(releaseStatus(latest,installed));setCheckedAt(new Date());
    }catch(failure){if(!controller.signal.aborted){setStatus('error');setError(failure.message);}}
  }
  useEffect(()=>{check();return()=>request.current?.abort();},[]);
  function download(){
    try{openReleaseDownload(release,installed);setDownloadOpened(true);setError('');}
    catch(failure){setError(failure.message);}
  }
  const Icon=status==='checking'?RotateCcw:status==='available'?Download:status==='current'?Check:WifiOff;
  const title=status==='checking'?'Checking for updates…':status==='available'?'A new version is ready':status==='current'?'You’re up to date':'Couldn’t check for updates';
  const canDownload=release&&release.versionCode>=installed.versionCode;
  return <div className="app-updates">
    <div className={`update-status ${status}`} role="status" aria-live="polite"><span className="update-icon"><Icon size={30}/></span><h3>{title}</h3><p>{status==='available'?`Arctic Play ${release.versionName} is available.`:status==='current'?'You have the latest available version.':status==='checking'?'Looking for the latest Arctic Play APK.':'Connect to the internet, then try again.'}</p></div>
    <dl className="update-details"><div><dt>Installed version</dt><dd>{installed.versionName}</dd></div>{release&&<><div><dt>Latest version</dt><dd>{release.versionName}</dd></div><div><dt>Download size</dt><dd>{(release.sizeBytes/1048576).toFixed(1)} MB</dd></div></>}</dl>
    {error&&<p className="update-error" role="alert">{error}</p>}
    {canDownload&&<button className={status==='available'?'primary full':'secondary full'} onClick={download}><Download size={19}/>{status==='available'?'Download update':'Download latest APK'}</button>}
    <button className={`${status==='available'?'secondary':'primary'} full update-check`} disabled={status==='checking'} onClick={check}><RotateCcw size={18}/>{status==='checking'?'Checking…':status==='error'?'Retry update check':'Check for updates'}</button>
    {downloadOpened&&<p className="update-download-note" role="status">The download is opening in your browser. When it finishes, open the APK and tap Update.</p>}
    {checkedAt&&status!=='checking'&&<p className="update-checked">Last checked at {checkedAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>}
    {release?.releaseNotes.length>0&&<section className="update-notes"><h3>What’s new in {release.versionName}</h3><ul>{release.releaseNotes.map(note=><li key={note}>{note}</li>)}</ul></section>}
    <p className="update-install-help"><Shield size={17}/><span>Your browser downloads the APK. Android asks you to confirm the update. Your profile, saved seats and practice games stay on this phone.</span></p>
  </div>;
}
