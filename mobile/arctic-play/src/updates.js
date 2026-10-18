import build from '../release-config.json';

export const APP_VERSION=build.versionName;
export const APP_VERSION_CODE=build.versionCode;
export const PACKAGE_NAME=build.packageName;
export const DOWNLOAD_ROOT='https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/';
export const UPDATE_FEED_URL=DOWNLOAD_ROOT+'latest.json';
const versionPattern=/^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;

export function installedVersion(android=globalThis.window?.Android){
  try{
    const info=JSON.parse(android?.getAppInfo?.());
    if(info.packageName===PACKAGE_NAME&&versionPattern.test(info.versionName)&&Number.isSafeInteger(info.versionCode)&&info.versionCode>0)return info;
  }catch{}
  return {...build};
}

// The feed cannot point the download button to an arbitrary website or APK.
export function validateRelease(value){
  if(!value||value.schemaVersion!==1||value.packageName!==PACKAGE_NAME||!versionPattern.test(value.versionName)||!Number.isSafeInteger(value.versionCode)||value.versionCode<1||value.versionCode>2147483647||value.downloadUrl!==DOWNLOAD_ROOT+`ArcticPlay-v${value.versionName}.apk`||!Number.isSafeInteger(value.sizeBytes)||value.sizeBytes<1||value.sizeBytes>100*1024*1024||!/^[a-f0-9]{64}$/.test(value.sha256)||!Array.isArray(value.releaseNotes)||value.releaseNotes.length>12||value.releaseNotes.some(note=>typeof note!=='string'||!note.trim()||note.length>300)||!Number.isFinite(Date.parse(value.publishedAt)))throw new Error('The update information is incomplete. Please try again later.');
  return {schemaVersion:1,packageName:value.packageName,versionName:value.versionName,versionCode:value.versionCode,downloadUrl:value.downloadUrl,sizeBytes:value.sizeBytes,sha256:value.sha256,publishedAt:value.publishedAt,releaseNotes:[...value.releaseNotes]};
}

export async function fetchLatestRelease({fetchImpl=globalThis.fetch,signal,timeoutMs=12000}={}){
  const controller=new AbortController();
  const abort=()=>controller.abort();
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
    const response=await fetchImpl(`${UPDATE_FEED_URL}?check=${Date.now()}`,{signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('The update service is unavailable. Please try again later.');
    return validateRelease(await response.json());
  }catch(error){
    if(signal?.aborted)throw error;
    if(controller.signal.aborted)throw new Error('The update check timed out. Check your internet connection and retry.');
    if(error instanceof TypeError||error instanceof SyntaxError)throw new Error('Could not reach the update service. Check your internet connection and retry.');
    throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

export function releaseStatus(release,installed=installedVersion()){
  return release.versionCode>installed.versionCode?'available':'current';
}

export function openReleaseDownload(release,installed=installedVersion(),environment=globalThis.window){
  const verified=validateRelease(release);
  if(verified.versionCode<installed.versionCode)throw new Error('This APK is older than your installed version.');
  if(verified.versionCode===installed.versionCode&&verified.versionName!==installed.versionName)throw new Error('The update versions do not match. Please try again later.');
  if(environment.Android?.downloadUpdate){
    if(!environment.Android.downloadUpdate(verified.downloadUrl))throw new Error('Could not open the download. Please try again.');
  }else environment.location.assign(verified.downloadUrl);
}
