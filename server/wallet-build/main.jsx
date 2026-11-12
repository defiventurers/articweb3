import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {ParaProvider,useAccount,useModal,useIssueJwt,useLogout} from '@getpara/react-sdk-lite';
import {useParaViemClient as useViemClient} from '@getpara/react-sdk-lite/chains/evm/viem';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createPublicClient,http,getAddress,encodeFunctionData,parseAbi,formatEther,defineChain} from 'viem';

import '@getpara/react-sdk-lite/styles.css';
import './wallet.css';
import {isAllowedWalletReturn} from './auth-return.mjs';
const API='/arctic-play/v3';
const selected=new URLSearchParams(location.search).get('attempt');
if(selected&&/^[\w-]{43}$/.test(selected))sessionStorage.setItem('ak-para-wallet-attempt',selected);
const attempt=selected||sessionStorage.getItem('ak-para-wallet-attempt');
async function call(path,data){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(60000)});const v=await r.json();if(!r.ok)throw Error(v.error||'Could not finish wallet setup.');return v;}
const queryClient=new QueryClient();
// Presentation overrides only; dashboard-owned login methods and security stay intact.
const passportBranding={themeConfig:{mode:'light',backgroundColor:'#f1f8ff',foregroundColor:'#173b59',accentColor:'#174e7b',borderRadius:'lg',font:'system-ui'},modalConfig:{logo:location.origin+'/arctic-play/wallet/passport/logo.webp'}};
function ConnectedPortal({config}){
 const account=useAccount(),{openModal}=useModal(),{issueJwtAsync}=useIssueJwt(),{logoutAsync}=useLogout();
 const wallet=account.embedded?.wallets?.find(w=>w.type==='EVM'),address=wallet?.address;
 const chain=defineChain(config.chain);
 const {viemClient}=useViemClient({address,walletClientConfig:{chain,transport:http()}});
 const [state,setState]=useState(null),[error,setError]=useState(''),[destination,setDestination]=useState(''),[asset,setAsset]=useState(null),[review,setReview]=useState(false),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState(null),[balance,setBalance]=useState(null);
 const completing=useRef(false),autoOpened=useRef(false);
 useEffect(()=>{if(!account.isConnected&&!autoOpened.current){autoOpened.current=true;try{openModal();}catch(e){setError(e.message);}}},[account.isConnected,openModal]);
 async function finish(){
  if(completing.current||!address||!viemClient||!account.embedded?.isConnected||account.embedded?.isGuestMode)return;
  completing.current=true;setBusy(true);setError('');
  try{
   const signature=await viemClient.signMessage({message:config.message});
   const {token}=await issueJwtAsync();
   const result=await call('/auth/para/complete',{attempt,idToken:token,address,signature});
   if(result.returnTo&&!isAllowedWalletReturn(result.returnTo,location.origin))throw Error('Return to the app to finish sign-in.');
   const value={config,chain,address:getAddress(address),walletClient:viemClient,result};setState(value);
   if(result.managed){try{const amount=await createPublicClient({chain,transport:http()}).getBalance({address:value.address});setBalance(formatEther(amount));}catch{}}
   else location.assign(result.returnTo);
  }catch(e){setError(e.shortMessage||e.message);}finally{setBusy(false);}
 }
 useEffect(()=>{if(!state&&!error)finish();},[address,viemClient,account.embedded?.isConnected]);
 async function retry(){completing.current=false;await finish();}
 async function changeAccount(){try{await logoutAsync();completing.current=false;setState(null);setError('');openModal();}catch(e){setError(e.message);}}
 async function transfer(){setBusy(true);setError('');try{
  const to=getAddress(destination.trim());if(to===state.address||/^0x0{40}$/i.test(to))throw Error('Choose another wallet address.');if(!asset?.transferable||asset.chainId!==state.config.chainId||asset.wallet.toLowerCase()!==state.address.toLowerCase())throw Error('This NFT cannot be sent from this wallet.');
  const abi=parseAbi(['function balanceOf(address account,uint256 id) view returns(uint256)','function safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)']);const pc=createPublicClient({chain:state.chain,transport:http()});if(await pc.readContract({address:asset.contract,abi,functionName:'balanceOf',args:[state.address,BigInt(asset.tokenId)]})<1n)throw Error('This collectible is no longer in your wallet.');
  const data=encodeFunctionData({abi,functionName:'safeTransferFrom',args:[state.address,to,BigInt(asset.tokenId),1n,'0x']});
  await pc.call({account:state.address,to:asset.contract,data});
  const hash=await state.walletClient.sendTransaction({chain:state.chain,to:asset.contract,data});
  setReceipt({hash,status:'submitted'});const mined=await pc.waitForTransactionReceipt({hash,confirmations:2});if(mined.status!=='success')throw Error('The transfer failed onchain.');setReceipt({hash,status:'confirmed'});setReview(false);setAsset(null);
 }catch(e){setError(e.shortMessage||e.message);}finally{setBusy(false);}}
 return <main className="pw"><img className="pw-brand" src="/arctic-play/wallet/passport/logo.webp" alt="Antarctic Gaming Co."/><p className="pw-eyebrow">WELCOME TO LANTERN HARBOR</p>{config.environment==='BETA'&&state?.result.managed&&<p role="status">Development wallet · {config.chain.name}</p>}<h1>{state?.result.managed?'Your game wallet':state?'Your wallet is ready.':busy?'Connecting your wallet…':'Welcome to Antarctic Kingdoms'}</h1>{!state&&<><p>Sign in to take your seat. Your game account is prepared automatically.</p>{!account.embedded?.isConnected&&<button disabled={busy} onClick={()=>openModal()}>Sign in or create account</button>}{account.isConnected&&!address&&<p>Finish creating an Ethereum / EVM game wallet in the sign-in window.</p>}{account.embedded?.isGuestMode&&<p role="alert">Choose a full sign-in method to save your game account.</p>}{error&&<p role="alert" className="pw-error">{error}</p>}{error&&address&&<button disabled={busy} onClick={retry}>Retry connection</button>}<button disabled={busy} onClick={changeAccount}>Use another sign-in</button></>}{state&&error&&<p role="alert" className="pw-error">{error}</p>}{state&&!state.result.managed&&<><p>Returning to Antarctic Kingdoms… If the app does not reopen, use the button below.</p><a className="pw-return" href={state.result.returnTo}>Return to Antarctic Kingdoms →</a></>}{state?.result.managed&&<><p>{state.chain.name}</p><code>{state.address}</code><p>Send only assets supported on this network.</p>{balance!==null&&<p>{balance} ETH</p>}<h2>Your game NFTs</h2>{!state.result.collectibles?.length&&<p>No delivered game NFTs are available yet.</p>}{state.result.collectibles?.map((a,i)=><section className="pw-asset" key={i}><strong>{a.title}</strong><p>{a.network}</p><p>{a.transferable?'Transferable collectible':'Permanent visa · non-transferable'}</p>{a.transferable&&a.chainId===state.config.chainId&&<button disabled={busy||a.wallet.toLowerCase()!==state.address.toLowerCase()} onClick={()=>{setAsset(a);setReview(false);setError('');}}>Send to another wallet</button>}</section>)}{asset&&<section className="pw-asset"><h2>Send {asset.title}</h2><label htmlFor="destination">Recipient’s {state.chain.name} wallet address</label><input id="destination" value={destination} onChange={e=>{setDestination(e.target.value);setReview(false);}} placeholder="0x…" autoComplete="off"/>{!review?<button onClick={()=>{try{getAddress(destination.trim());setReview(true);setError('');}catch{setError('Enter a valid wallet address.');}}}>Review transfer</button>:<><p>Send one collectible on {state.chain.name} to:</p><code>{destination}</code><p>Blockchain transfers cannot be undone. A network fee may apply.</p><button disabled={busy} onClick={transfer}>{busy?'Confirming transfer…':'Confirm & send'}</button></>}</section>}{receipt&&<p role="status"><a href={state.chain.blockExplorers.default.url+'/tx/'+receipt.hash} target="_blank" rel="noreferrer">{receipt.status==='confirmed'?'Transfer confirmed':'Transfer submitted'} ↗</a></p>}<a className="pw-return" href="arcticplay://camp/restore">Return to the app</a></> }<p className="pw-small">Wallet technology: Para. Keep access to your sign-in and recovery methods.</p></main>;
}
class WalletBoundary extends React.Component{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<main className="pw"><h1>Sign-in could not open</h1><p>Return to the app and try again. If it continues, check your connection and the project’s allowed origin.</p></main>:this.props.children;}}
function Portal(){
 const [config,setConfig]=useState(null),[error,setError]=useState('');
 useEffect(()=>{if(!/^[\w-]{43}$/.test(attempt||'')){setError('Open sign-in from Antarctic Kingdoms.');return;}let live=true;call('/auth/para/attempt',{attempt}).then(c=>{if(live)setConfig(c);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 if(error)return <main className="pw"><h1>Sign-in needs attention</h1><p role="alert">{error}</p><p>Return to the app and start sign-in again.</p></main>;
 if(!config)return <main className="pw"><h1>Opening sign-in…</h1></main>;
 return <QueryClientProvider client={queryClient}><ParaProvider paraClientConfig={{apiKey:config.apiKey}} config={{appName:'Antarctic Kingdoms'}} configOverrides={passportBranding} externalWalletConfig={{evmConnector:{config:{chains:[defineChain(config.chain)]}}}}><ConnectedPortal config={config}/></ParaProvider></QueryClientProvider>;
}
createRoot(document.getElementById('root')).render(<WalletBoundary><Portal/></WalletBoundary>);
