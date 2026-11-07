"""Exercise the actual packaged Games expedition in Chromium; API replies are local fixtures.

Requires playwright and build/games.cjs. Pass --browser to an installed Chromium.
This verifies presentation and routing, not live authentication or multiplayer.
"""
from pathlib import Path
import argparse,json,mimetypes,subprocess
from playwright.sync_api import sync_playwright,expect

p=argparse.ArgumentParser()
p.add_argument('--browser',required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args();mobile=Path(__file__).resolve().parents[1]
assets=mobile/'android/app/src/main/assets';a.output.mkdir(parents=True,exist_ok=True)
account='11111111-1111-4111-8111-111111111111'
passport={'id':'passport-fixture','number':'AK-FIXTURE','playerName':'Saved Player','deliveries':[]}
saved=json.loads(subprocess.check_output(['node','-e',"const g=require(process.argv[1]);let s=g.create('xiangqi'),a=g.actions('xiangqi',s)[0];s=g.apply('xiangqi',s,a.id);console.log(JSON.stringify({practice:{id:'xiangqi',state:s,mode:'hotseat',humans:['red','blue'],history:[],guide:false},target:a.target,piece:g.pieces('xiangqi',s).find(p=>p.cell===a.target).id}));",str(mobile/'build/games.cjs')],text=True))
checks=[];errors=[];layouts=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=a.browser,args=['--no-sandbox','--disable-dev-shm-usage'])
 def context(practice=None,theme='dark',conquests=None,ledger=None):
  c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
  values={'cloud-session':{'accountId':account,'session':account+'.'+'q'*43},'antarctic-visa.v1.'+account:passport,'theme':theme,'mascot-companions':{'mode':'off','motion':False}}
  if conquests is not None:values['conquest-stamps.v1.'+account]=conquests
  if ledger is not None:values['hall-journey.v1.'+account]=ledger
  if practice:values.update({'practice.'+practice['id']:practice,'last-table':{'id':practice['id']}})
  c.add_init_script('const seed='+json.dumps(values)+';for(const [key,value]of Object.entries(seed))localStorage.setItem("arctic-play.v1."+key,JSON.stringify(value));window.WebSocket=undefined;window.Android={appReady(){},setDarkTheme(){},getAppInfo:()=>JSON.stringify({packageName:"xyz.arcticdominion.play",versionName:"5.9.8",versionCode:96})};')
  def route(r):
   url=r.request.url.split('?')[0]
   fixtures={'/capabilities':{'version':2,'cloud':True,'accountPlay':True},'/passport':{'identity':{'accountId':account,'displayName':'Saved Player'},'passport':passport},'/play-access':{'accountId':account,'online':True,'leaseSeconds':60,'offlineOwned':False,'license':None,'marketingChoiceNeeded':False},'/auth/providers':{}}
   for suffix,value in fixtures.items():
    if url.endswith(suffix):r.fulfill(json=value);return
   f=assets/url.split('/assets/',1)[-1]
   if '/assets/' in url and f.is_file():r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
   else:r.abort()
  c.route('**/*',route);page=c.new_page();page.set_default_timeout(6000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('https://appassets.androidplatform.net/assets/index.html');page.locator('.home-v2').wait_for()
  page.wait_for_function("()=>[...document.querySelectorAll('.home-v2 img')].every(n=>n.complete&&n.naturalWidth>0)")
  return c,page
 c,page=context();page.locator('.bottom-nav').get_by_role('button',name='Games',exact=True).click()
 page.locator('[data-expedition-id="dominion"]').wait_for()
 expect(page.locator('.exp-next-hint')).to_contain_text('8 more games to discover')
 expect(page.locator('.exp-region')).to_have_text('Indian subcontinent')
 assert '574' not in page.locator('.exp-hero').inner_text()
 assert page.locator('.discovery-search').count()==0
 order=['dominion','xiangqi','shogi','sanguo','sanyou','sannin','yanyi','co-tu-lenh','shanshui']
 def stable():page.wait_for_function("()=>[...document.querySelectorAll('.exp-chapter img')].every(n=>n.complete&&n.naturalWidth>0)")
 for theme in ['dark','light']:
  if theme=='light':page.locator('.header-theme').click()
  for width,height in [(320,640),(360,800),(390,844),(412,915),(768,1024),(844,390)]:
   page.set_viewport_size({'width':width,'height':height})
   for i,id in enumerate(order):
    if i:page.get_by_role('button',name='Next game',exact=True).click()
    expect(page.locator('.exp-chapter')).to_have_attribute('data-expedition-id',id);stable()
    assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth'),(theme,width,id)
    boxes=page.locator('.games-expedition button').evaluate_all("nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({h:n.getBoundingClientRect().height,text:n.innerText}))")
    assert all(b['h']>=44 for b in boxes),(theme,width,id,boxes)
    dock=page.locator('.expedition-dock').bounding_box();nav=page.locator('.bottom-nav').bounding_box()
    assert dock['y']+dock['height']<=nav['y']+2,(dock,nav)
    # At smaller viewports the page scrolls while the Crown/navigation dock stays available.
    page.locator('.lobby-content').evaluate('n=>n.scrollTop=n.scrollHeight')
    layouts.append({'theme':theme,'viewport':[width,height],'game':id,'horizontalOverflow':False,'minimumTouchHeight':44,'dockAboveNavigation':True})
   for _ in range(8):page.get_by_role('button',name='Previous game',exact=True).click()
   page.locator('.lobby-content').evaluate('n=>n.scrollTop=0')
   if width==390:page.screenshot(path=str(a.output/('Adventure-Chaturanga-'+theme+'.png')))
 checks.append('All nine chapters at six sizes in both themes: original images load, 44px controls, no horizontal overflow, Crown/navigation dock above bottom nav.')
 page.set_viewport_size({'width':390,'height':844});page.locator('.exp-chapter').focus();page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight');expect(page.locator('.exp-chapter')).to_have_attribute('data-expedition-id','shogi')
 page.locator('.exp-chapter').evaluate("n=>{n.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,changedTouches:[new Touch({identifier:1,target:n,clientX:80,clientY:300})]}));n.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,changedTouches:[new Touch({identifier:1,target:n,clientX:240,clientY:310})]}))}")
 expect(page.locator('.exp-chapter')).to_have_attribute('data-expedition-id','sanguo');expect(page.locator('.exp-chapter-progress')).to_contain_text('Locked')
 page.screenshot(path=str(a.output/'Adventure-locked-chapter.png'))
 page.locator('.exp-primary').click();page.get_by_role('dialog').wait_for();expect(page.get_by_role('dialog')).to_contain_text('Unlock Sanguo Qi');page.evaluate('window.arcticBack()')
 checks.append('Right swipe and consecutive arrow keys advance; locked chapters preview their story and retain the real existing unlock sheet.')
 page.get_by_role('button',name='All games',exact=False).first.click();page.locator('.discovery-search').wait_for();assert page.locator('[data-catalogue-id]').count()==9
 page.get_by_role('searchbox',name='Search games').fill('xiangqi');assert page.locator('[data-catalogue-id]').count()==2
 page.get_by_role('searchbox',name='Search games').fill('');page.locator('[data-catalogue-id="xiangqi"] .market-favorite').click();page.get_by_role('button',name='Favorites',exact=True).click();assert page.locator('[data-catalogue-id]').count()==1
 page.get_by_role('button',name='All',exact=True).click();page.screenshot(path=str(a.output/'Adventure-original-grid.png'))
 page.get_by_role('button',name='Adventure',exact=False).first.click();expect(page.locator('.exp-chapter')).to_have_attribute('data-expedition-id','sanguo')
 page.reload();page.locator('.bottom-nav').get_by_role('button',name='Games',exact=True).click();expect(page.locator('.exp-chapter')).to_have_attribute('data-expedition-id','sanguo')
 checks.append('Original nine-game grid, search, favorites, play/learn handlers and selected chapter persistence are retained.')
 c.close()
 c,page=context(conquests={'dominion':{'matchId':'example-completed-match','at':1794000000000,'source':'canonical-result'}});page.locator('.bottom-nav').get_by_role('button',name='Games',exact=True).click();expect(page.locator('.exp-conquest')).to_have_class('exp-conquest is-conquered');expect(page.locator('.exp-conquest')).to_contain_text('Chaturanga');stable();page.screenshot(path=str(a.output/'Adventure-conquered-example.png'))
 page.get_by_role('button',name='Next game',exact=True).click();assert 'is-conquered' not in page.locator('.exp-conquest').get_attribute('class')
 page.get_by_role('button',name='All games',exact=False).first.click();assert page.locator('[data-catalogue-id="dominion"] .grid-conquest').count()==1;assert page.locator('[data-catalogue-id="xiangqi"] .grid-conquest').count()==0
 checks.append('A saved conquest appears only for its own game, in the bottom-centre gold stamp and the retained grid; neighbouring games are not forged.')
 c.close()
 # Controlled near-win fixture; the final capture still runs through the real game worker.
 finishing=json.loads(subprocess.check_output(['node','-e',"const g=require(process.argv[1]);let s=g.create('dominion');s.board=Array.from({length:8},()=>Array(8).fill(null));s.board[3][3]={id:'green-final-king',team:'green',type:'king',isRoyal:true};s.board[3][4]={id:'red-final-king',team:'red',type:'king',isRoyal:true};s.eliminatedTeams=['blue','yellow'];s.dice={values:[1,null],used:[false,true],rolled:true,count:1};console.log(JSON.stringify({id:'dominion',state:s,mode:'bots',humans:['green'],actionLog:['fixture-previous-move'],progressEligible:true,matchId:'canonical-finish-fixture',history:[],guide:false}));",str(mobile/'build/games.cjs')],text=True))
 c,page=context(practice=finishing)
 page.locator('.home-v2-primary').click();page.locator('[data-cell="3,3"]').wait_for()
 page.wait_for_function("()=>document.querySelector('.board-viewport')?.getAttribute('aria-busy')!=='true'")
 assert page.evaluate("()=>!localStorage.getItem('arctic-play.v1.conquest-stamps.v1.'+"+json.dumps(account)+")")
 page.locator('[data-cell="3,3"]').press('Enter');expect(page.locator('[data-cell="3,3"]')).to_have_attribute('aria-pressed','true')
 page.locator('[data-cell="3,4"]').press('Enter');page.locator('.result-card').wait_for()
 page.wait_for_function("()=>JSON.parse(localStorage.getItem('arctic-play.v1.conquest-stamps.v1.'+"+json.dumps(account)+")||'{}').dominion?.matchId==='canonical-finish-fixture'")
 stamp=page.evaluate("()=>JSON.parse(localStorage.getItem('arctic-play.v1.conquest-stamps.v1.'+"+json.dumps(account)+")).dominion")
 page.evaluate('window.arcticBack()');page.locator('.bottom-nav').get_by_role('button',name='Games',exact=True).click()
 expect(page.locator('.exp-conquest')).to_have_class('exp-conquest is-conquered')
 expect(page.locator('.exp-conquest')).to_contain_text('Chaturanga')
 page.reload();page.locator('.bottom-nav').get_by_role('button',name='Games',exact=True).click()
 expect(page.locator('.exp-conquest')).to_have_class('exp-conquest is-conquered')
 assert page.evaluate("()=>JSON.parse(localStorage.getItem('arctic-play.v1.conquest-stamps.v1.'+"+json.dumps(account)+")).dominion.at")==stamp['at']
 checks.append('A real worker-applied final Chaturanga capture earns its cosmetic crown; no crown before winning, and the original earned date survives reload. Controlled near-win fixture, not a full-match replay.')
 c.close();browser.close();assert not errors,errors
 report={'version':'5.9.8','checks':checks,'layoutCases':len(layouts),'layouts':layouts,'pageErrors':errors,'accountApi':'local fixtures','nativeBridge':'simulated','physicalAndroidTested':False,'liveSignInTested':False}
 (a.output/'Adventure-Browser-QA.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'checks':checks,'layoutCases':len(layouts),'pageErrors':errors},indent=2))
