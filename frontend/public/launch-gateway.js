// Preserve existing game, operator, editor and test links while sharing APK UI at home.
(()=>{const p=new URLSearchParams(location.search),entry=[...p.keys()].every(k=>k.startsWith('utm_')||(k==='view'&&p.get(k)==='launch-dashboard'));if(location.pathname==='/'&&entry)location.replace('/play/'+location.search);})();
