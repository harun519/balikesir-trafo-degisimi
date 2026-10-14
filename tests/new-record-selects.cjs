const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),requests=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)){requests.push(u.origin);if(u.hostname==='trafo-fixture.supabase.co')return route.fulfill({contentType:'application/json',body:'[]'});return route.abort()}if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});const path=require('node:path'),root=path.resolve(__dirname,'..'),file=u.pathname==='/'?path.join(root,'.next/server/app/index.html'):u.pathname.startsWith('/_next/static/')?path.join(root,'.next/static',u.pathname.slice('/_next/static/'.length)):path.join(root,'public',u.pathname);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream',body:fs.readFileSync(file)})});
 await context.addInitScript(()=>{
  const user={id:'fixture-user',email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
  const jwt=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:user.id}))+'.fixture';
  localStorage.setItem('sb-trafo-fixture-auth-token',JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
  localStorage.setItem('trafo_user_role_cache_v1',JSON.stringify({userId:user.id,role:'admin',cachedAt:Date.now()}));
  const records=Array.from({length:40},(_,i)=>({id:i+1,sira_no:i+1,yil:i<20?2026:2025,ay:'EKİM',tarih:(i<20?'2026':'2025')+'-10-01',ilce:i%2?'BALYA':'İVRİNDİ',mahalle:'Örnek mahalle',trafo_id:'TR-'+i,tr:'TR-'+i,degisim_nedeni:i<20?(i%2?'ARIZA':'DÖNÜŞÜM'):(i%4?'ARIZA':'DÖNÜŞÜM'),sokulen_gucu:'100',takilan_gucu:i<15?'160':i<25?'100':i<35?'63':'',sokulen_markasi:'ABB',takilan_markasi:'BEST',aciklama:'Örnek açıklama'}));
  if(!localStorage.getItem('trafo_test_keep_cache'))localStorage.setItem('trafo_degisim_cache_v1',JSON.stringify(records));
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BASE_URL||'http://localhost:3100');await page.locator('#dashboard-hero').waitFor();
 const pages=[['neden-guc-analizi','Neden × Güç Analizi'],['ilce-analizi','İlçe Analizi'],['trafo-guc-analizi','Trafo Güç Analizi']];
 const go=async(label,width)=>{if(width<1024)await page.locator('header button').filter({hasText:'☰'}).click();await page.locator('aside:visible nav button').filter({hasText:label}).click()};
 const snapshot=await page.evaluate(()=>localStorage.getItem('trafo_degisim_cache_v1')),results=[];


 await go('Yeni Kayıt',1440);const form=page.locator('form.trafo-new-record'),stepper=page.locator('#new-record-stepper');

 for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844]]){
  await page.setViewportSize({width,height});await stepper.locator('button').first().click();await page.evaluate(()=>scrollTo(0,0));const trigger=page.locator('#combo-yil');await trigger.scrollIntoViewIfNeeded();await trigger.click();const popup=page.locator('.nr-select-popup');await popup.waitFor();
  assert.equal(await page.locator('.nr-select-search input').evaluate(e=>e===document.activeElement),true,'Search focused '+width);
  assert.ok(await popup.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}),'Popup fits '+width);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SCREENSHOT_DIR+'/select-year-'+width+'.png'})}
  await page.locator('.nr-select-search input').fill('2026');assert.ok(await popup.evaluate(e=>e.getBoundingClientRect().height<=220),'Single search result uses a compact menu');await popup.getByRole('option',{name:'2026',exact:true}).click();assert.equal(await trigger.inputValue(),'2026');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
  await trigger.click();assert.match(await page.locator('.nr-select-options [aria-selected=true]').innerText(),/2026.*✓/s);await page.keyboard.press('Escape');assert.equal(await trigger.inputValue(),'2026');await trigger.click();await form.getByRole('heading',{name:'Tarih & Konum Bilgileri'}).click();await popup.waitFor({state:'detached'});results.push({width,height});
 }
 await page.setViewportSize({width:1366,height:768});await stepper.locator('button').first().click();await page.locator('#combo-ilce').click();await page.locator('.nr-select-search input').fill('ivr');await page.keyboard.press('Enter');assert.equal(await page.locator('#combo-ilce').inputValue(),'İVRİNDİ');
 await page.locator('#combo-yil').click();await page.keyboard.press('Tab');assert.equal(await page.locator('#combo-ay').evaluate(e=>e===document.activeElement),true);await page.locator('#combo-yil').click();await page.locator('.nr-select-search input').fill('2026');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');assert.equal(await page.locator('#combo-yil').inputValue(),'2026');
 await page.locator('#combo-mahalle').click();await page.locator('.nr-select-search input').fill('ÖZEL MAHALLE');await page.locator('.nr-select-create').click();assert.equal(await page.locator('#combo-mahalle').inputValue(),'ÖZEL MAHALLE');await page.locator('#combo-mahalle').click();await page.getByRole('button',{name:'Temizle',exact:true}).click();assert.equal(await page.locator('#combo-mahalle').inputValue(),'');
 await stepper.locator('button').nth(1).click();assert.match(await page.locator('#new-record-summary').innerText(),/Güç girin/);await page.locator('#combo-sguc').click();await page.locator('.nr-select-search input').fill('100');await page.keyboard.press('Enter');assert.equal(await page.locator('#combo-sguc').inputValue(),'100');assert.equal(await page.locator('#combo-tguc').inputValue(),'');
 await page.locator('#combo-tguc').click();await page.locator('.nr-select-search input').fill('160');await page.keyboard.press('Enter');assert.match(await page.locator('#new-record-summary').innerText(),/Güç Artışı/);
 if(process.env.SCREENSHOT_DIR){await page.evaluate(()=>scrollTo(0,0));await page.locator('#combo-sguc').click();await page.screenshot({path:process.env.SCREENSHOT_DIR+'/select-power-1366.png'});await page.keyboard.press('Escape')}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:results,checks:'Popup bounds, search focus, pointer/keyboard selection, Turkish search, selected mark, outside/Escape closing, custom value/clear and empty power status passed',errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
