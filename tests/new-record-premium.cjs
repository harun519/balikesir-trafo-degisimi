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

 await go('Yeni Kayıt',1440);
 const form=page.locator('form.trafo-new-record'),stepper=page.locator('#new-record-stepper'),summary=page.locator('#new-record-summary');
 const report=[];
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844]]){
  await page.setViewportSize({width,height});
  for(let step=1;step<=3;step++){
   await stepper.locator('button').nth(step-1).click();await page.waitForTimeout(80);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow '+width+' step '+step);
   assert.ok(await stepper.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'All steps fit '+width);
   assert.equal(await stepper.locator('[aria-current="step"]').count(),1);if(width>=600)assert.ok(await stepper.locator('button>span:last-child').evaluateAll(es=>es.every(e=>{const [title,subtitle]=e.children;return title.getBoundingClientRect().bottom<=subtitle.getBoundingClientRect().top+1})),'Step titles and subtitles never overlap '+width);
   assert.ok(await summary.isVisible(),'Summary available '+width);
   assert.ok(await form.locator('input:not([type=checkbox]),textarea').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),p=e.closest('#new-record-main').getBoundingClientRect();return r.width>=80&&r.left>=p.left-1&&r.right<=p.right+1})),'Fields within form '+width+' step '+step);
   if(step===2&&width>=768){const cards=await form.locator('.nr-transformer').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left}}));assert.ok(Math.abs(cards[0].top-cards[1].top)<1&&cards[1].left>cards[0].left,'Transformer cards side by side '+width)}
   if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:process.env.SCREENSHOT_DIR+'/new-record-'+width+'-step'+step+'.png',fullPage:true})}
  }
  report.push({width,height,steps:3});
 }
 await page.setViewportSize({width:1366,height:768});await stepper.locator('button').nth(0).click();
 await form.locator('input[type=date]').fill('2026-10-14');assert.equal(await page.locator('#combo-yil').inputValue(),'2026');assert.equal(await page.locator('#combo-ay').inputValue(),'EKİM');
 const choose=async(id,value)=>{const input=page.locator('#combo-'+id);await input.fill(value);await input.press('Enter');assert.equal(await input.inputValue(),value)};
 await choose('ilce','BALYA');await form.getByLabel('Trafo ID',{exact:true}).fill('NEW-FIXTURE-101');await form.getByLabel('Lokasyon ID',{exact:true}).fill('LK-999');
 await page.locator('#new-record-actions').getByRole('button',{name:'Trafo Değişimine Geç'}).click();await choose('sguc','100');await choose('tguc','160');
 await form.locator('.nr-removed').getByLabel('Seri No',{exact:true}).fill('REMOVED-101');await form.locator('.nr-installed').getByLabel('Seri No',{exact:true}).fill('INSTALLED-101');
 assert.match(await summary.innerText(),/100.*160/s);await page.locator('#new-record-actions').getByRole('button',{name:'Değişim & Onay'}).click();
 await choose('degisim-nedeni','ARIZA');await form.getByLabel('Açıklama',{exact:true}).fill('Yeni kayıt ekranı test açıklaması.');
 const save=page.locator('#new-record-actions button[type=submit]');assert.ok(await save.isDisabled());await form.getByRole('checkbox').check();assert.ok(await save.isEnabled());
 // Inspect the local draft rather than inserting a live record.
 await page.waitForTimeout(1000);const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('trafo_yeni_kayit_taslak')));assert.ok(JSON.stringify(draft).includes('NEW-FIXTURE-101'));
 await page.locator('#new-record-actions').getByRole('button',{name:/Geri/}).click();assert.equal(await form.locator('.nr-removed').getByLabel('Seri No',{exact:true}).inputValue(),'REMOVED-101');await stepper.locator('button').nth(0).click();assert.equal(await form.getByLabel('Trafo ID',{exact:true}).inputValue(),'NEW-FIXTURE-101');
 await page.reload();await page.locator('#dashboard-hero').waitFor();await go('Yeni Kayıt',1366);await page.getByRole('button',{name:'Taslağı Yükle',exact:true}).click();await stepper.locator('button').nth(0).click();assert.equal(await form.getByLabel('Trafo ID',{exact:true}).inputValue(),'NEW-FIXTURE-101');await stepper.locator('button').nth(2).click();assert.equal(await form.getByLabel('Açıklama',{exact:true}).inputValue(),'Yeni kayıt ekranı test açıklaması.');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:report,checks:'All steps fit, paired transformer cards, date auto-fill, searchable dropdowns, values across steps, approval gating and draft restoration passed',errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
