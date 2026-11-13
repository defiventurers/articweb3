const app=document.querySelector('.app');
if(app){
 const requested=Number(new URL(location.href).searchParams.get('width')),width=[320,393,680].includes(requested)?requested:393;
 app.style.width=width+'px';app.style.setProperty('--ch-w',width+'px');
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Layout review');nav.style.cssText='position:fixed;left:8px;top:8px;width:160px;z-index:100;background:#061a32;padding:10px;color:white;border:1px solid #9bd9ff;font:13px system-ui';
 nav.append('Static layout fixture · '+width+'px');
 const state=location.pathname.includes('-rolled.html')?'rolled':'unrolled';
 for(const w of [320,393,680]){const a=document.createElement('a');a.href='/early-layout-'+state+'.html?width='+w;a.textContent=w+' px';a.style.cssText='display:block;color:#bdeaff;padding:6px';nav.append(a);}
 for(const value of ['unrolled','rolled']){const a=document.createElement('a');a.href='/early-layout-'+value+'.html?width='+width;a.textContent=value==='rolled'?'After roll':'Before roll';a.style.cssText='display:block;color:#bdeaff;padding:6px';nav.append(a);}
 document.body.append(nav);
}
