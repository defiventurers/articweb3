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
 def context(practice=None,theme='dark',count=0,rooms=None,motion='reduce',legacyPage=None):
  c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion=motion)
  values={'cloud-session':{'accountId':account,'session':account+'.'+'q'*43},'antarctic-visa.v1.'+account:passport,'theme':theme,'mascot-companions':{'mode':'off','motion':False}}
  values['profile']={'id':'passport-qa','name':'Explorer','avatar':'red'}
  values['eternal-gathering.v1']={'halls':{name:{'learnedAt':1794000000000+i*86400000} for i,name in enumerate(['xiangqi','shogi','sannin','sanguo','sanyou','yanyi','dominion'][:count])}}
  if legacyPage is not None:values['passport-page.v1.passport-qa']=legacyPage
  if rooms is not None:values['rooms']=rooms
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
 def nav(page,label):
  page.locator('.bottom-nav').get_by_role('button',name=label,exact=True).click()
  if label=='Passport':page.get_by_role('button',name='Open your Passport',exact=False).click()
 def stable(page):page.wait_for_function("()=>[...document.querySelectorAll('.passport-book img')].every(n=>n.complete&&n.naturalWidth>0)")
 def shot(page,name):stable(page);page.screenshot(path=str(a.output/(name+'.png')))
 c,page=context(count=3);nav(page,'Passport');page.locator('.passport-book').wait_for();stable(page)
 expect(page.locator('.pp-book-caption')).to_contain_text('3 / 7')
 assert page.locator('.profile-card,.unlock-journey,.companion-dock,.social-destinations').count()==0
 for theme in ['dark','light']:
  if theme=='light':page.locator('.header-theme').click()
  for width,height in [(320,640),(360,800),(390,844),(412,915),(768,1024),(844,390)]:
   page.set_viewport_size({'width':width,'height':height})
   for index in range(6):
    if index:page.get_by_role('button',name='Next passport page').click()
    stable(page)
    assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth'),(theme,width,index)
    metrics=page.locator('.pp-volume-stage').evaluate('n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height}}')
    assert abs(metrics['width']/metrics['height']-176/125)<.02,(theme,width,index,metrics)
    leaves=page.locator('.pp-paper>.pp-leaf').evaluate_all('nodes=>nodes.map(n=>({scroll:n.scrollHeight,height:n.clientHeight,text:n.innerText}))')
    assert all(n['scroll']<=n['height']+2 for n in leaves),(theme,width,index,leaves)
    actions=page.locator('.passport-book button').evaluate_all("nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,disabled:n.disabled}))")
    assert all(n['height']>=44 for n in actions),(theme,width,index,actions)
    page.locator('.pp-next-stamp').scroll_into_view_if_needed()
    assert page.locator('.pp-next-stamp').evaluate('(n)=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}')
    layouts.append({'theme':theme,'viewport':[width,height],'page':index,'noHorizontalOverflow':True,'allActionsReachable':True})
   page.evaluate('window.arcticBack()');expect(page.locator('.pp-spread')).to_have_attribute('data-page','0')
  page.set_viewport_size({'width':390,'height':844});page.locator('.lobby-content').evaluate('n=>n.scrollTop=0');shot(page,'Passport-arrival-'+theme)
  page.get_by_role('button',name='Next passport page').click();shot(page,'Passport-stamps-'+theme);page.evaluate('window.arcticBack()')
 checks.append('Six spreads at six viewport sizes in both themes: no horizontal overflow, all book buttons at least 44px tall, next action reachable.')
 page.get_by_role('button',name='Next passport page').click();page.reload();nav(page,'Passport');expect(page.locator('.pp-spread')).to_have_attribute('data-page','1')
 assert page.locator('[data-stamp][data-earned="true"]').count()==2
 checks.append('Old lantern timestamps survive; earned stamps render with dates and the last book page survives reopening.')
 page.locator('.pp-spread').focus();page.keyboard.press('ArrowRight');expect(page.locator('.pp-spread')).to_have_attribute('data-page','2');page.keyboard.press('ArrowLeft');expect(page.locator('.pp-spread')).to_have_attribute('data-page','1')
 page.locator('.pp-spread').evaluate("n=>{n.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,changedTouches:[new Touch({identifier:1,target:n,clientX:250,clientY:230})]}));n.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[new Touch({identifier:1,target:n,clientX:90,clientY:240})]}))}")
 expect(page.locator('.pp-spread')).to_have_attribute('data-page','2')
 checks.append('Buttons, arrow keys, horizontal swipe and native Back turn the book; reduced-motion preference is respected.')
 page.get_by_role('button',name='Passport settings').click();page.locator('summary').filter(has_text='App & help').click();page.get_by_role('button',name='App updates',exact=False).click();page.locator('.app-updates').wait_for();expect(page.locator('.app-updates')).to_contain_text('5.9.7')
 page.evaluate('window.arcticBack()');page.locator('.pp-settings').wait_for();page.evaluate('window.arcticBack()');page.locator('.passport-book').wait_for()
 page.get_by_role('button',name='Passport settings').click();page.locator('summary').filter(has_text='Account').click();page.locator('.profile-logout').click();page.locator('.logout-panel').wait_for();page.evaluate('window.arcticBack()');page.locator('.pp-settings').wait_for();page.get_by_role('button',name='Back to passport').click()
 checks.append('Account/logout confirmation and app updates remain reachable through grouped settings; Back closes modals before Passport subviews.')
 page.locator('.pp-extras-entry').click();page.get_by_role('button',name='Discoveries',exact=False).click();page.get_by_role('dialog').wait_for();page.evaluate('window.arcticBack()');page.get_by_role('button',name='Back to passport').click()
 nav(page,'Chats');page.locator('.chat-inbox').wait_for();assert page.locator('.chat-camp,.social-destinations,.companion-dock').count()==0
 assert not any(text in page.locator('main').inner_text() for text in ['Learn & discover','Daily puzzle','Around the Gathering'])
 shot(page,'Chats-simple');page.get_by_role('button',name='Join a room',exact=True).click();page.locator('#room-code').wait_for();assert page.locator('#room-code input').count()==6;page.evaluate('window.arcticBack()')
 page.get_by_role('button',name='Invite friends',exact=True).click();page.get_by_role('dialog').wait_for();page.evaluate('window.arcticBack()');page.get_by_role('button',name='Saved friends',exact=False).click();page.locator('.app[data-tab="friends"]').wait_for()
 checks.append('Chats contains only room conversations, Join, Invite and Saved friends; learning, Camp and stories remain accessible from Passport extras.')
 c.close()
 c,page=context(rooms={'ABC234':{'room':{'roomCode':'ABC234','tableId':'xiangqi','status':'waiting','chat':[{'text':'Ready for a rematch?'}]},'at':1234}});nav(page,'Chats');expect(page.locator('.table-row')).to_contain_text('Xiangqi · ABC234');expect(page.locator('.table-row')).to_contain_text('Ready for a rematch?');checks.append('Saved room conversations retain their game, room code, latest message and existing reconnect button.');c.close()
 c,page=context(count=7);nav(page,'Passport');page.locator('.pp-next-stamp').click();expect(page.locator('.pp-spread')).to_have_attribute('data-page','5');expect(page.locator('.pp-crown-page')).to_contain_text('CROWN STAMP EARNED');assert 'unearned' not in page.locator('.pp-crown-large').get_attribute('class');shot(page,'Passport-crown-earned')
 before=page.evaluate("localStorage.getItem('arctic-play.v1.eternal-gathering.v1')");page.reload();nav(page,'Passport');expect(page.locator('.pp-crown-page')).to_contain_text('CROWN STAMP EARNED');assert page.evaluate("localStorage.getItem('arctic-play.v1.eternal-gathering.v1')")==before
 checks.append('Seven migrated stamps automatically show the Crown with a stable date; opening the book never modifies learning records or claims the optional Eighth Lantern story.')
 page.get_by_role('button',name='Play another game',exact=False).click();page.locator('.discovery-search').wait_for();assert page.locator('[data-catalogue-id]').count()==9;checks.append('After earning the Crown, the primary action returns to the real game catalogue.');c.close()
 c,page=context();nav(page,'Passport');page.locator('.pp-next-stamp').click();page.locator('.story-adventure[data-story-game="xiangqi"]').wait_for();page.locator('[data-testid="game-adventure"][data-ready="true"]').wait_for()
 steps=json.loads(subprocess.check_output(['node','-e',"const a=require(process.argv[1]),g=require(process.argv[2]),m=require(process.argv[3]);let p=a.adventurePosition('xiangqi','cannon-bridge',m.preferredSetup('xiangqi','cannon-bridge')),path=[],out=[];while(!p.complete){let move=p.legal[0];out.push({from:g.pieces('xiangqi',p.state).find(s=>s.source===move.source).cell,target:move.target});path.push(move.id);p=a.adventurePosition('xiangqi','cannon-bridge',m.preferredSetup('xiangqi','cannon-bridge'),path);out[out.length-1].stage=p.stage;out[out.length-1].complete=p.complete;}console.log(JSON.stringify(out));",str(mobile/'build/adventures.cjs'),str(mobile/'build/games.cjs'),str(mobile/'build/minimalLearning.cjs')],text=True))
 page.locator('.story-adventure .board-viewport[aria-busy="false"]').wait_for()
 for step in steps:
  page.locator('.story-adventure [data-cell="'+step['from']+'"]').press('Enter');expect(page.locator('.story-adventure [data-cell="'+step['from']+'"]')).to_have_attribute('aria-pressed','true');page.locator('.story-adventure [data-cell="'+step['target']+'"]').press('Enter')
  expect(page.locator('[data-testid="game-adventure"]')).to_have_attribute('data-stage',str(step['stage']))
  if step['complete']:expect(page.locator('[data-testid="game-adventure"]')).to_have_attribute('data-complete','true')
 page.locator('[data-complete="true"][data-watching="false"]').wait_for();page.get_by_role('button',name='Return to your journey',exact=True).last.click();page.locator('.passport-book').wait_for();page.get_by_role('button',name='Open your Passport',exact=False).click();expect(page.locator('.pp-book-caption')).to_contain_text('1 / 7');expect(page.locator('.pp-spread')).to_have_attribute('data-page','1');expect(page.locator('.pp-new-stamp')).to_contain_text('River Lantern stamp added');assert page.locator('[data-stamp="xiangqi"]').get_attribute('data-earned')=='true'
 checks.append('The real Xiangqi guided challenge accepts its canonical move and awards a persisted lantern stamp in the new book.')
 c.close()
 c,page=context(count=3,motion='no-preference');page.locator('.bottom-nav').get_by_role('button',name='Passport',exact=True).click()
 expect(page.locator('.pp-volume')).to_have_attribute('data-open','false')
 assert page.locator('.pp-bound-pages').get_attribute('inert') is not None
 assert page.locator('.pp-pagination').is_hidden()
 box=page.locator('.pp-cover-hit-target').bounding_box();assert abs(box['width']/box['height']-88/125)<.02,box
 shot(page,'Passport-cover-closed')
 before=page.evaluate("localStorage.getItem('arctic-play.v1.eternal-gathering.v1')")
 page.get_by_role('button',name='Open your Passport',exact=False).click();page.wait_for_timeout(300)
 assert page.locator('.pp-front-cover').evaluate("n=>getComputedStyle(n).transform.startsWith('matrix3d')")
 shot(page,'Passport-cover-opening');page.wait_for_function("()=>!document.querySelector('.pp-volume').classList.contains('is-opening')")
 expect(page.locator('.pp-volume')).to_have_attribute('data-open','true')
 page.get_by_role('button',name='Next passport page').click();page.wait_for_timeout(220)
 assert page.locator('.pp-turn-scene.is-turning').count()==1
 assert page.locator('.pp-turn-back .pp-stamp-name').count()==2
 shot(page,'Passport-leaf-turning');page.wait_for_function("()=>!document.querySelector('.pp-turn-scene')")
 expect(page.locator('.pp-spread')).to_have_attribute('data-page','1')
 for stamp in page.locator('[data-stamp][data-earned="true"]').all():
  assert stamp.locator('time').get_attribute('datetime').endswith('Z')
  assert 'UTC' in stamp.locator('time').inner_text()
  assert stamp.locator('.pp-stamp-name').inner_text()
 assert page.evaluate("localStorage.getItem('arctic-play.v1.eternal-gathering.v1')")==before
 page.get_by_role('button',name='Close Passport',exact=True).click();page.wait_for_function("()=>!document.querySelector('.pp-volume').classList.contains('is-opening')")
 expect(page.locator('.pp-volume')).to_have_attribute('data-open','false')
 cover=page.locator('.pp-cover-hit-target');cover.scroll_into_view_if_needed();box=cover.bounding_box();x=box['x']+box['width']*.8;y=box['y']+box['height']*.5
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-75,y,steps=6)
 assert page.locator('.pp-volume.is-dragging').count()==1
 assert 0<float(page.locator('.pp-volume').evaluate("n=>n.style.getPropertyValue('--cover-progress')"))<1
 page.mouse.up();page.wait_for_function("()=>!document.querySelector('.pp-volume').classList.contains('is-opening')")
 expect(page.locator('.pp-volume')).to_have_attribute('data-open','true')
 checks.append('Closed cover hides page controls; hinged front/back cover, reversible close, finger-following drag and actual two-sided leaf turns work with normal motion. Dates retain original instants and local timezone; opening never changes milestones.')
 c.close()
 c,page=context(count=3,legacyPage=3);nav(page,'Passport');expect(page.locator('.pp-spread')).to_have_attribute('data-page','5')
 assert page.evaluate("JSON.parse(localStorage.getItem('arctic-play.v1.passport-page.v1.passport-qa'))")==3
 assert page.evaluate("JSON.parse(localStorage.getItem('arctic-play.v1.passport-page.v2.passport-qa'))")==5
 checks.append('An existing Crown reading position migrates from old spread four to compact spread six without rewriting its old record.')
 c.close();browser.close();assert not errors,errors
 report={'version':'5.9.7','checks':checks,'layoutCases':len(layouts),'layouts':layouts,'pageErrors':errors,'network':'mocked account API; real bundled workers and legal-move engine','androidBridge':'simulated','physicalAndroidTested':False,'liveSignInTested':False}
 (a.output/'Passport-Browser-QA.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'checks':checks,'layoutCases':len(layouts),'pageErrors':errors},indent=2))
