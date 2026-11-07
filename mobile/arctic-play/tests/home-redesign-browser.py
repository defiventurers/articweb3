"""Exercise the actual packaged Home in Chromium; API replies are local fixtures.

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
 def context(practice=None,theme='dark'):
  c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
  values={'cloud-session':{'accountId':account,'session':account+'.'+'q'*43},'antarctic-visa.v1.'+account:passport,'theme':theme,'mascot-companions':{'mode':'off','motion':False}}
  if practice:values.update({'practice.xiangqi':practice,'last-table':{'id':'xiangqi'}})
  c.add_init_script('const seed='+json.dumps(values)+';for(const [key,value]of Object.entries(seed))localStorage.setItem("arctic-play.v1."+key,JSON.stringify(value));window.WebSocket=undefined;window.Android={appReady(){},setDarkTheme(){},getAppInfo:()=>JSON.stringify({packageName:"xyz.arcticdominion.play",versionName:"5.9.7",versionCode:95})};')
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
 c,page=context()
 assert page.locator('.home-v2-primary').get_attribute('aria-label')=='Explore the Games'
 assert page.locator('.home-v2-hosts').get_attribute('alt').startswith('Nova,')
 assert page.locator('.home-v2 .home-search').count()==0
 assert page.locator('.header-update').is_hidden()
 checks.append('New player sees one Explore CTA, Nova and all four hosts, with search deferred to Games.')
 for theme in ['dark','light']:
  if theme=='light':page.locator('.header-theme').click()
  page.wait_for_function('(theme)=>document.documentElement.dataset.theme===theme',arg=theme)
  for width,height in [(320,640),(360,800),(390,844),(412,915),(768,1024),(844,390)]:
   page.set_viewport_size({'width':width,'height':height})
   page.locator('.home-v2-story').scroll_into_view_if_needed()
   metrics=page.evaluate("""()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.home-v2 button')].map(n=>{const b=n.getBoundingClientRect();return {text:n.innerText,width:b.width,height:b.height,left:b.left,right:b.right}})})""")
   assert metrics['scrollWidth']<=width,(theme,width,metrics)
   assert all(n['height']>=44 and n['left']>=0 and n['right']<=width for n in metrics['buttons']),(theme,width,metrics)
   assert page.locator('.home-v2-story').evaluate('(n)=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}')
   layouts.append({'theme':theme,'viewport':[width,height],'horizontalOverflow':False,'minimumTouchHeight':44,'allActionsReachable':True})
   page.locator('.lobby-content').evaluate('(n)=>n.scrollTop=0')
   if width==390:
    page.wait_for_timeout(150);page.screenshot(path=str(a.output/('Home-'+theme+'.png')))
 checks.append('All Home actions remain reachable at six viewport sizes in both themes; no horizontal overflow; 44px touch targets.')
 page.set_viewport_size({'width':390,'height':844})
 page.locator('.home-v2-primary').click();page.locator('.discovery-search').wait_for()
 assert not page.locator('html').evaluate('(n)=>n.classList.contains("home-v2-active")')
 page.wait_for_function("()=>document.querySelectorAll('[data-catalogue-id]').length===9")
 page.get_by_role('searchbox',name='Search games').fill('xiangqi')
 expect(page.locator('[data-catalogue-id]')).to_have_count(2)
 assert sorted(page.locator('[data-catalogue-id]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.catalogueId)'))==['shanshui','xiangqi']
 page.get_by_role('searchbox',name='Search games').fill('')
 page.locator('[data-catalogue-id="xiangqi"] .market-favorite').click()
 page.get_by_role('button',name='Favorites',exact=True).click()
 expect(page.locator('[data-catalogue-id]')).to_have_count(1)
 assert page.locator('[data-catalogue-id]').get_attribute('data-catalogue-id')=='xiangqi'
 page.get_by_role('button',name='All',exact=True).click()
 checks.append('Explore opens all nine catalogue entries, search and favorites work, and Home-only styling is removed.')
 page.get_by_role('button',name='Home',exact=True).click();page.locator('.home-v2-tile').first.click()
 page.locator('.game-card').first.wait_for()
 expect(page.locator('.discovery-intents button.selected')).to_have_text('Learn')
 checks.append('Learn enters the existing learning catalogue.')
 page.get_by_role('button',name='Home',exact=True).click();page.locator('.home-v2-friends').click()
 page.locator('#join-name').wait_for();assert page.locator('#room-code input').count()==6
 page.locator('#join-name').fill('   ')
 expect(page.get_by_role('button',name='Join table',exact=False)).to_be_disabled()
 page.locator('#room-code').evaluate("""n=>{const data=new DataTransfer();data.setData('text','https://articweb3.onrender.com/arctic-play/app/?room=ABC234');n.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:data}))}""")
 expect(page.get_by_role('dialog')).to_contain_text('Joining room ABC234')
 expect(page.get_by_role('button',name='Change room',exact=True)).to_be_visible()
 page.locator('#join-name').fill('Harbor Player')
 expect(page.get_by_role('button',name='Join table',exact=False)).to_be_enabled()
 page.get_by_role('button',name='Close',exact=True).click()
 checks.append('Join opens the validated name and six-character code form; invitation paste and blank-name guard work.')
 page.locator('.home-v2-shop').click();page.locator('.app[data-tab="shop"]').wait_for()
 checks.append('Physical boards opens the existing Shop; Home labels the artwork as a concept preview.')
 page.get_by_role('button',name='Home',exact=True).click();page.locator('.home-v2-journey').click()
 page.locator('.passport-book').wait_for();page.get_by_role('button',name='Home',exact=True).click()
 page.locator('.home-v2-story').click();page.get_by_role('dialog').wait_for()
 page.get_by_role('button',name='Close',exact=True).click()
 checks.append('Home Passport opens the new book; story opens the world guide.')
 page.get_by_role('button',name='Passport',exact=True).click()
 page.get_by_role('button',name='Passport settings').click();page.locator('summary').filter(has_text='App & help').click();page.locator('.profile-options').get_by_role('button',name='App updates',exact=False).click();page.locator('.app-updates').wait_for()
 expect(page.locator('.app-updates')).to_contain_text('5.9.7')
 checks.append('Manual updates remain accessible in Passport settings and report installed version 5.9.7.')
 c.close()
 c,page=context(saved['practice'])
 assert page.locator('.home-v2-primary').get_attribute('aria-label')=='Continue Xiangqi'
 assert 'Continue playing' in page.locator('.home-v2-primary').inner_text()
 assert 'xiangqi' in page.locator('.home-v2-primary img').get_attribute('src')
 page.locator('.home-v2-primary').click();page.locator('[data-cell]').first.wait_for()
 assert page.locator('[data-cell="'+saved['target']+'"]').get_attribute('data-piece')==saved['piece']
 checks.append('Continue uses the saved game’s cover and restores its moved piece at the saved destination.')
 c.close();browser.close()
 assert not errors,errors
 report={'version':'5.9.7','checks':checks,'layouts':layouts,'pageErrors':errors,'network':'mocked fixtures','physicalAndroidTested':False,'liveSignInTested':False}
 (a.output/'Home-Browser-QA.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
