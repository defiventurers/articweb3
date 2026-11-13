// Applied before CSS/React so returning light-mode players see daylight ice
// from the first document frame, even when the app is opened offline.
(()=>{let theme='dark';try{if(JSON.parse(localStorage.getItem('arctic-play.v1.theme'))==='light')theme='light';}catch{}
 document.documentElement.dataset.theme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#061a32':'#dceffb');
 window.Android?.setDarkTheme(theme==='dark');
})();
