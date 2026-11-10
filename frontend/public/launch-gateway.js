// Preserve every direct legacy game/operator URL; the new homepage shares APK UI.
(()=>{const p=new URLSearchParams(location.search);if(location.pathname==='/'&&!p.has('game')&&!p.has('legacy')&&!p.has('auth_ticket')&&!p.has('calibrate')&&!p.has('smoke')&&!p.has('admin'))location.replace('/play/'+location.search);})();
