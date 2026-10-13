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
  const records=Array.from({length:40},(_,i)=>({id:i+1,sira_no:i+1,yil:i<20?2026:2025,ay:'EKİM',tarih:(i<20?'2026':'2025')+'-10-01',ilce:i%2?'BALYA':'İVRİNDİ',mahalle:'Örnek mahalle',trafo_id:'TR-'+i,tr:'TR-'+i,degisim_nedeni:i%2?'ARIZA':'DÖNÜŞÜM',sokulen_gucu:'100',takilan_gucu:'160',sokulen_markasi:'ABB',takilan_markasi:'BEST',aciklama:'Örnek açıklama'}));
  localStorage.setItem('trafo_degisim_cache_v1',JSON.stringify(records));
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BASE_URL||'http://localhost:3100');await page.locator('#dashboard-hero').waitFor();
 const pages=[['neden-guc-analizi','Neden × Güç Analizi'],['ilce-analizi','İlçe Analizi'],['trafo-guc-analizi','Trafo Güç Analizi']];
 const go=async(label,width)=>{if(width<1024)await page.locator('header button').filter({hasText:'☰'}).click();await page.locator('aside:visible nav button').filter({hasText:label}).click()};
 const snapshot=await page.evaluate(()=>localStorage.getItem('trafo_degisim_cache_v1')),results=[];
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#dashboard-kpis > *').count(),4);assert.equal(await page.getByRole('heading',{name:'Son Trafo Değişimleri',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:/Son Sistem Hareketleri/}).count(),0);assert.equal(await page.getByText('Sistem Durumu',{exact:true}).count(),0);assert.match(await page.locator('#dashboard-scope-kpis').innerText(),/EN YOĞUN İLÇE/);assert.equal(await page.locator('#degisim-nedenleri').count(),1);assert.equal(await page.locator('#zaman-analizi').count(),1);for(const [id] of pages)assert.equal(await page.locator('#'+id).count(),0,'Dashboard omits analysis '+id);assert.ok(await page.locator('#dashboard-hero').evaluate(e=>e.clientHeight<150));
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SCREENSHOT_DIR+'/trafo-'+width+'.png',fullPage:false})}results.push({width});
 }
 await page.setViewportSize({width:1440,height:900});
 const filters=page.locator('#dashboard-filters');await filters.locator('select').nth(0).selectOption('2026');await filters.locator('select').nth(1).selectOption('BALYA');assert.match(await filters.innerText(),/10 kayıt/);
 await filters.getByRole('button',{name:'Arıza',exact:true}).click();await page.waitForTimeout(250);assert.match(await filters.innerText(),/10 kayıt/);assert.equal(await filters.getByRole('button',{name:'Arıza',exact:true}).evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
 await filters.getByRole('button',{name:'Filtreyi Temizle',exact:true}).click();assert.match(await filters.innerText(),/40 kayıt/);
 for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844]]){
  await page.setViewportSize({width,height});
  for(const [id,label] of pages){
   await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));await go(label,width);await page.locator('main[data-page="'+id+'"]').waitFor();await page.waitForTimeout(120);
   assert.equal(await page.locator('#dashboard-hero h1').innerText(),label);assert.equal(await page.locator('#'+id).count(),1);assert.equal(await page.locator('#dashboard-kpis').count(),0);assert.equal(await page.locator('#degisim-nedenleri').count(),0);assert.equal(await page.locator('#zaman-analizi').count(),0);
   for(const [other] of pages)if(other!==id)assert.equal(await page.locator('#'+other).count(),0,'Only selected analysis mounted');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.evaluate(()=>window.scrollY<2),'Tab opens at top');
   assert.equal(await page.locator('aside:visible nav button[aria-current="page"]').count(),1);
   if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/tab-'+id+'-'+width+'.png',fullPage:false});
  }
 }
 await page.setViewportSize({width:1440,height:900});await go('Kontrol Paneli',1440);
 await filters.locator('select').nth(0).selectOption('2026');await filters.locator('select').nth(1).selectOption('BALYA');
 await go('İlçe Analizi',1440);assert.equal(await filters.locator('select').nth(0).inputValue(),'2026');assert.equal(await filters.locator('select').nth(1).inputValue(),'BALYA');assert.match(await filters.innerText(),/10 kayıt/);
 await go('Kontrol Paneli',1440);await filters.getByRole('button',{name:'Filtreyi Temizle',exact:true}).click();
 await page.locator('#degisim-nedenleri .trafo-reason-list').getByRole('button',{name:/^ARIZA\s+20/}).click();await page.locator('main[data-page="kayitlar"]').waitFor();assert.ok(await page.locator('select').evaluateAll(es=>es.some(e=>e.value==='ARIZA')));
 await page.locator('aside:visible nav button').filter({hasText:'Kontrol Paneli'}).click();await page.locator('#dashboard-hero').waitFor();
 await page.locator('#dashboard-hero button').filter({hasText:'Yeni Kayıt'}).click();await page.locator('main[data-page="yeni"]').waitFor();assert.equal(await page.locator('#dashboard-hero').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('trafo_degisim_cache_v1')),snapshot);assert.deepEqual(errors,[]);assert.ok(requests.every(origin=>origin==='https://trafo-fixture.supabase.co'));console.log(JSON.stringify({results,filters:'year, district, quick reason and reset passed',actions:'reasons and time charts on dashboard, three independent tabs, active menu, top reset, shared filters, drilldown and new record passed',network:'external fixture requests intercepted; no live services accessed',errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
