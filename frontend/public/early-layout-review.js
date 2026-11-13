const frame=document.querySelector('iframe');
for(const button of document.querySelectorAll('[data-width]'))button.onclick=()=>{frame.width=button.dataset.width;frame.height=Math.ceil(Number(frame.width)*1536/865+200);};
for(const button of document.querySelectorAll('[data-state]'))button.onclick=()=>{frame.src='/early-layout-'+button.dataset.state+'.html';};
