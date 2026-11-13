const MAX_BYTES = 100 * 1024 * 1024;
const MAX_PART_BYTES = 8 * 1024 * 1024;
const digestPattern = /^[a-f0-9]{64}$/;
export function validateManifest(value, baseUrl) {
  const base = new URL(baseUrl);
  const local = ['localhost','127.0.0.1','[::1]'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !(local && base.protocol === 'http:')) || base.username || base.password) throw Error('Open the secure download page.');
  if (!value || value.schemaVersion !== 1 || value.review !== true || !/^\d+\.\d+\.\d+$/.test(value.version || '') || !Number.isSafeInteger(value.versionCode) || value.versionCode < 1 || value.versionCode > 2147483647) throw Error('Download information is invalid.');
  if (value.filename !== `AntarcticKingdoms-v${value.version}.apk` || !Number.isSafeInteger(value.bytes) || value.bytes < 1 || value.bytes > MAX_BYTES || !digestPattern.test(value.sha256 || '')) throw Error('Download file information is invalid.');
  if (!Number.isSafeInteger(value.chunkBytes) || value.chunkBytes < 1 || value.chunkBytes > MAX_PART_BYTES || !Array.isArray(value.parts) || value.parts.length < 1 || value.parts.length > 100 || value.parts.length !== Math.ceil(value.bytes / value.chunkBytes)) throw Error('Download parts are invalid.');
  let total = 0;
  const parts = value.parts.map((part,index) => {
    const expected = index === value.parts.length - 1 ? value.bytes - index * value.chunkBytes : value.chunkBytes;
    if (!part || part.file !== `part-${String(index).padStart(3,'0')}.bin` || !Number.isSafeInteger(part.bytes) || part.bytes !== expected || part.bytes > MAX_PART_BYTES || !digestPattern.test(part.sha256 || '')) throw Error('Download part information is invalid.');
    const url = new URL(part.file, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(new URL('.',base).pathname) || url.search || url.hash) throw Error('Download part location is invalid.');
    total += part.bytes;
    return {file:part.file,bytes:part.bytes,sha256:part.sha256,url:url.href};
  });
  if (total !== value.bytes) throw Error('Download size does not match.');
  return {schemaVersion:1,review:true,version:value.version,versionCode:value.versionCode,filename:value.filename,bytes:value.bytes,sha256:value.sha256,chunkBytes:value.chunkBytes,parts};
}
export async function sha256(bytes, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) throw Error('This browser cannot securely check the download. Use a current browser over HTTPS.');
  return [...new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
}
async function readExact(response, expected) {
  const declared = response.headers?.get?.('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > expected)) throw Error('A download part exceeded its declared size.');
  const reader = response.body?.getReader?.();
  if (!reader) { const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength !== expected) throw Error('A download part has the wrong size.'); return bytes; }
  const bytes = new Uint8Array(expected); let offset = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      if (offset + value.byteLength > expected) throw Error('A download part exceeded its declared size.');
      bytes.set(value,offset); offset += value.byteLength;
    }
    if (offset !== expected) throw Error('A download part has the wrong size.');
    return bytes;
  } catch (error) { await reader.cancel().catch(()=>{}); throw error; }
}
export async function assembleApk(value, {baseUrl,fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,onProgress=()=>{},signal} = {}) {
  const manifest = validateManifest(value,baseUrl), assembled = new Uint8Array(manifest.bytes);
  let offset = 0;
  for (const [index,part] of manifest.parts.entries()) {
    if (signal?.aborted) throw new DOMException('Download cancelled.','AbortError');
    onProgress({verifiedBytes:offset,totalBytes:manifest.bytes,part:index+1,partCount:manifest.parts.length,checking:true});
    const response = await fetchImpl(part.url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal});
    if (!response.ok || response.redirected || response.type === 'opaque' || (response.url && new URL(response.url).origin !== new URL(baseUrl).origin)) throw Error('A download part could not be retrieved. Please try again.');
    const bytes = await readExact(response,part.bytes);
    if (await sha256(bytes,cryptoImpl) !== part.sha256) throw Error('A download part failed its integrity check. Nothing was saved.');
    assembled.set(bytes,offset); offset += bytes.byteLength;
    onProgress({verifiedBytes:offset,totalBytes:manifest.bytes,part:index+1,partCount:manifest.parts.length,checking:false});
  }
  if (signal?.aborted) throw new DOMException('Download cancelled.','AbortError');
  const completeDigest = await sha256(assembled,cryptoImpl);
  if (signal?.aborted) throw new DOMException('Download cancelled.','AbortError');
  if (completeDigest !== manifest.sha256) throw Error('The complete APK failed its integrity check. Nothing was saved.');
  return {manifest,bytes:assembled};
}

async function startPage() {
  const button=document.getElementById('download'), cancel=document.getElementById('cancel'), save=document.getElementById('save'), progress=document.getElementById('progress'), status=document.getElementById('status');
  if (!button || !cancel || !save || !progress || !status) return;
  let manifest, controller, objectUrl;
  const baseUrl = new URL('./',location.href).href;
  const metadataController = new AbortController(), metadataTimeout = setTimeout(()=>metadataController.abort(),10000);
  try {
    const response=await fetch(new URL('manifest.json',baseUrl),{credentials:'same-origin',redirect:'error',cache:'no-store',signal:metadataController.signal});
    if (!response.ok || response.redirected) throw Error('Download information is unavailable.');
    const text=await response.text(); if (text.length > 32768) throw Error('Download information is too large.');
    manifest=validateManifest(JSON.parse(text),baseUrl);
    document.getElementById('version').textContent=`${manifest.version} · code ${manifest.versionCode}`;
    document.getElementById('size').textContent=`${(manifest.bytes/1024/1024).toFixed(1)} MiB`;
    document.getElementById('checksum').textContent=manifest.sha256;
    button.disabled=false; status.textContent='Ready. Choose Download Android APK to begin.';
  } catch (error) { status.textContent=error.name==='AbortError'?'Download information timed out. Reload this page to try again.':error.message || 'Download information could not be checked.'; return; }
  finally {clearTimeout(metadataTimeout);}
  cancel.addEventListener('click',()=>controller?.abort());
  window.addEventListener('pagehide',()=>{controller?.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);},{once:true});
  button.addEventListener('click',async()=>{
    button.disabled=true;cancel.hidden=false;save.hidden=true;progress.hidden=false;progress.value=0;controller=new AbortController();
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    try {
      const {bytes}=await assembleApk(manifest,{baseUrl,signal:controller.signal,onProgress:info=>{progress.value=info.verifiedBytes/info.totalBytes*100;status.textContent=info.checking?`Downloading and checking part ${info.part} of ${info.partCount}…`:`Checked ${(info.verifiedBytes/1024/1024).toFixed(1)} MiB of ${(info.totalBytes/1024/1024).toFixed(1)} MiB…`;}});
      objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.android.package-archive'}));
      save.href=objectUrl;save.download=manifest.filename;save.hidden=false;progress.value=100;
      status.textContent='The complete file passed its SHA-256 check. Your browser will save it; choose Save APK if needed.';
      save.click();
    } catch (error) { status.textContent=error.name==='AbortError'?'Download cancelled. You can try again.':error.message || 'The download could not be checked. Nothing was saved.'; }
    finally {button.disabled=false;cancel.hidden=true;controller=null;}
  });
}
if (typeof document !== 'undefined') startPage();
