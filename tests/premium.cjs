/* v3 additions: browser behaviour, privacy, accessibility and offline regression. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const pp = require('puppeteer'), serve = require('../scripts/server.cjs');
let passed=0, failed=0;
const wait = ms => new Promise(r=>setTimeout(r,ms));
async function test(name,fn){try{await fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.stack)}}
(async()=>{
 const server=serve('/mamss-website/');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/mamss-website/`;
 const browser=await pp.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 async function page(width=1440,hash=''){
  const c=await browser.createBrowserContext(),p=await c.newPage();p.errors=[];p.writes=[];
  p.on('pageerror',e=>p.errors.push(e.message));p.on('request',r=>{if(r.method()!=='GET')p.writes.push(r.method()+' '+r.url())});
  await p.setViewport({width,height:900});await p.goto(base+hash,{waitUntil:'networkidle0'});await p.waitForFunction(()=>!!window.MAMSS);return p;
 }
 async function close(p){assert.deepEqual(p.errors,[]);assert.deepEqual(p.writes,[]);await p.browserContext().close()}
 async function click(p,s){await p.waitForSelector(s,{visible:true});await p.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.click(s)}
 async function planner(p,{date='2030-10-10',time='10:30',entry='SS 1',notes='Please advise whom I should meet.'}={}){
  await click(p,'#home [data-premium=visit]');await p.select('#visit-entry',entry);
  await p.evaluate(({date,time})=>{document.querySelector('#visit-date').value=date;document.querySelector('#visit-time').value=time;},{date,time});
  await click(p,'#visit-form button[type=submit]');await p.waitForSelector('#visit-notes');if(notes)await p.type('#visit-notes',notes);await click(p,'#visit-form button[type=submit]');await p.waitForSelector('#visit-summary');
 }
 async function axe(p){await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});return p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))})}
 async function noOverflow(p){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await p.evaluate(()=>[...document.querySelectorAll('dialog[open]')].some(e=>e.scrollWidth>e.clientWidth+1)),false)}
 try {
  await test('school stories support keyboard arrows, Home, End and correct photo/link changes',async()=>{
   const p=await page();await click(p,'#story-tab-learning');await p.keyboard.press('ArrowRight');
   assert.equal(await p.$eval('#story-tab-community',e=>e.getAttribute('aria-selected')),'true');
   await p.waitForFunction(()=>document.querySelector('#story-photo').currentSrc.includes('mamss_students')&&document.querySelector('#story-photo').naturalWidth>0);
   await p.keyboard.press('End');assert.equal(await p.$eval('#story-link',e=>e.hash),'#purpose');
   assert.equal(await p.$$eval('[data-story][tabindex="0"]',e=>e.length),1);
   await p.keyboard.press('Home');assert.equal(await p.$eval('#story-panel',e=>e.getAttribute('aria-labelledby')),'story-tab-learning');await close(p);
  });
  await test('unavailable story photography has an accessible retry, not a broken image',async()=>{
   const p=await page();let block=true;await p.setRequestInterception(true);p.on('request',r=>block&&r.url().includes('visit031')?r.abort():r.continue());
   await click(p,'#story-tab-faith');await p.waitForFunction(()=>!document.querySelector('#story-image-status').hidden);
   assert.match(await p.$eval('#story-image-status',e=>e.textContent),/unavailable/);
   block=false;await click(p,'#story-photo-retry');await p.waitForFunction(()=>document.querySelector('#story-photo').naturalWidth>0&&document.querySelector('#story-image-status').hidden);await close(p);
  });
  await test('all chapter contents point to existing, navigable sections',async()=>{
   const p=await page();const links=await p.$$eval('.chapter-contents a',es=>es.map(e=>e.hash));assert.equal(links.length,11);
   for(const width of [375,1440]){await p.setViewport({width,height:900});for(const chapter of ['about','learning','school-life','admissions']){await p.evaluate(h=>MAMSS.go(h),chapter);assert.equal(await p.evaluate(()=>{const page=document.querySelector('[data-page].is-active'),nav=page.querySelector('.chapter-contents'),heading=page.querySelector('.chapter-heading');return getComputedStyle(nav).position!=='absolute'&&nav.getBoundingClientRect().top>=heading.getBoundingClientRect().bottom;}),true)}}
   for(const href of links){await p.evaluate(h=>MAMSS.go(h.slice(1)),href);assert.equal(await p.evaluate(h=>document.querySelector(h).getClientRects().length>0,href),true)}await close(p);
  });
  await test('first planner step requires an interest, and time without a date is rejected',async()=>{
   const p=await page();await click(p,'#home [data-premium=visit]');await click(p,'#visit-form button[type=submit]');assert.ok(await p.$('#visit-entry'));assert.equal(await p.$('#visit-notes'),null);
   await p.select('#visit-entry','JSS 1');await p.$eval('#visit-time',e=>e.value='11:00');await click(p,'#visit-form button[type=submit]');assert.match(await p.$eval('#visit-error',e=>e.textContent),/Choose a proposed day/);await close(p);
  });
  await test('planner offers only published entry classes and a general enquiry',async()=>{
   const p=await page();await click(p,'#home [data-premium=visit]');assert.deepEqual(await p.$$eval('#visit-entry option',es=>es.map(e=>e.value)),['','JSS 1','JSS 2','SS 1','SS 2','general']);await close(p);
  });
  await test('a reviewed email contains the chosen class, proposed day and honest boundaries',async()=>{
   const p=await page();await planner(p);const text=await p.$eval('#visit-summary',e=>e.value);assert.match(text,/SS 1/);assert.match(text,/10 October 2030 at 10:30 \(Lagos time\)/);assert.match(text,/not a booking/);assert.match(text,/whom I should meet/);
   const u=await p.$eval('#visit-mail',e=>e.href);assert.match(u,/^mailto:matermesericordiae@gmail.com\?/);assert.equal(new URL(u).searchParams.get('body'),text);assert.equal(await p.evaluate(()=>localStorage.length),0);await close(p);
  });
  await test('back navigation keeps questions, preferences and class editable',async()=>{
   const p=await page();await planner(p);await click(p,'#visit-back');assert.equal(await p.$eval('#visit-notes',e=>e.value),'Please advise whom I should meet.');await click(p,'[name=visit-topic][value=faith]');await click(p,'#visit-back');assert.equal(await p.$eval('#visit-entry',e=>e.value),'SS 1');assert.equal(await p.$eval('#visit-date',e=>e.value),'2030-10-10');await click(p,'#visit-form button[type=submit]');assert.equal(await p.$eval('[name=visit-topic][value=faith]',e=>e.checked),true);await close(p);
  });
  await test('a general enquiry needs no date and never invents an appointment',async()=>{
   const p=await page();await planner(p,{entry:'general',date:'',time:''});assert.match(await p.$eval('#visit-summary',e=>e.value),/Please advise on a suitable day and time/);assert.equal(await p.$eval('#visit-reminder',e=>e.disabled),true);await close(p);
  });
  await test('Escape restores the launch control; partial answers survive closing but not reload',async()=>{
   const p=await page();await click(p,'#home [data-premium=visit]');await p.select('#visit-entry','SS 2');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.matches('#home [data-premium=visit]'));await click(p,'#home [data-premium=visit]');assert.equal(await p.$eval('#visit-entry',e=>e.value),'SS 2');await p.reload({waitUntil:'networkidle0'});await click(p,'#home [data-premium=visit]');assert.equal(await p.$eval('#visit-entry',e=>e.value),'');assert.equal(await p.evaluate(()=>localStorage.length),0);await close(p);
  });
  await test('clearing a plan is explicit and requires confirmation',async()=>{
   const p=await page();await planner(p);await click(p,'#visit-reset');assert.ok(await p.$('#visit-summary'));await click(p,'#visit-reset');assert.equal(await p.$eval('#visit-entry',e=>e.value),'');await close(p);
  });
  await test('free text stays inert in the review, email and personal reminder',async()=>{
   const p=await page();const payload='</textarea><img src=x onerror="window.planInjection=1">';await planner(p,{notes:payload});assert.equal(await p.evaluate(()=>window.planInjection),undefined);assert.equal(await p.$('#content-dialog img[src=x]'),null);assert.ok((await p.$eval('#visit-summary',e=>e.value)).includes(payload));await click(p,'#visit-reminder');assert.ok((await p.evaluate(()=>deskState.reminders[0].notes)).includes(payload));await close(p);
  });
  await test('download contains the exact reviewed plan, not an application or booking',async()=>{
   const p=await page();await planner(p);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mamss-visit-'));const c=await p.createCDPSession();await c.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await click(p,'#visit-download');await wait(450);const file=path.join(dir,'MAMSS-personal-visit-enquiry.txt');assert.equal(fs.readFileSync(file,'utf8'),await p.$eval('#visit-summary',e=>e.value));fs.rmSync(dir,{recursive:true,force:true});await close(p);
  });
  await test('copy writes the reviewed text and gives an honest fallback if permission is denied',async()=>{
   const p=await page();await planner(p);await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedPlan=text}}}));await click(p,'#visit-copy');assert.equal(await p.evaluate(()=>window.copiedPlan),await p.$eval('#visit-summary',e=>e.value));
   await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied')}}}));await click(p,'#visit-copy');assert.match(await p.$eval('#visit-status',e=>e.textContent),/selected/);assert.equal(await p.$eval('#visit-summary',e=>e.selectionEnd-e.selectionStart===e.value.length),true);await close(p);
  });
  await test('personal follow-up integrates with the desk, avoids duplicates and uses Lagos time',async()=>{
   const p=await page();await planner(p);await click(p,'#visit-reminder');assert.equal(await p.evaluate(()=>deskState.reminders.length),1);assert.equal(await p.$eval('#visit-reminder',e=>e.disabled),true);await p.$eval('#visit-reminder',e=>e.click());assert.equal(await p.evaluate(()=>deskState.reminders.length),1);assert.equal(await p.evaluate(()=>localStorage.length),0);
   assert.match(await p.evaluate(()=>makeCalendar(deskState.reminders)),/DTSTART:20301010T093000Z/);assert.match(await p.evaluate(()=>makeCalendar(deskState.reminders)),/STATUS:TENTATIVE/);
   await click(p,'#visit-desk');assert.equal(await p.evaluate(()=>MAMSS.current),'desk');assert.equal(await p.evaluate(()=>deskTab),'planner');await close(p);
  });
  await test('reminders persist only with prior, explicit device-saving consent',async()=>{
   const p=await page(375,'#school-desk');await click(p,'#enable-device-saving');await p.evaluate(()=>MAMSS.go('home'));await planner(p);await click(p,'#visit-reminder');await p.reload({waitUntil:'networkidle0'});assert.equal(await p.evaluate(()=>deskState.reminders.length),1);assert.equal(await p.evaluate(()=>deskState.consent),true);await click(p,'#home [data-premium=visit]');assert.equal(await p.$eval('#visit-entry',e=>e.value),'');await close(p);
  });
  await test('the shared 100-reminder limit cannot be bypassed by the visit planner',async()=>{
   const p=await page();await p.evaluate(()=>deskState.reminders=Array.from({length:100},(_,i)=>({id:'limit-'+i,title:'Existing reminder',date:'2030-10-10',time:'',notes:''})));await planner(p);await click(p,'#visit-reminder');assert.match(await p.$eval('#visit-error',e=>e.textContent),/100 reminders/);assert.equal(await p.evaluate(()=>deskState.reminders.length),100);await close(p);
  });
  for(const width of [320,375,768,1440]) {
   const p=await page(width);await click(p,'#home [data-premium=visit]');
   for(let step=1;step<=3;step++) await test(`${width}px: visit planner step ${step} passes accessibility and fits its dialog`,async()=>{
    await noOverflow(p);assert.deepEqual(await axe(p),[]);
    if(step===1){await p.select('#visit-entry','JSS 2');await click(p,'#visit-form button[type=submit]')}
    if(step===2)await click(p,'#visit-form button[type=submit]');
   });
   await close(p);
  }
  for(const width of [375,1440]) await test(`${width}px: story tabs remain accessible in all three states`,async()=>{
   const p=await page(width);for(const key of ['learning','community','faith']){await click(p,`#story-tab-${key}`);assert.deepEqual(await axe(p),[]);await noOverflow(p)}await close(p);
  });
  for(const width of [320,1440]) await test(`${width}px: photo thumbnails, keyboard selection and zoom are accessible`,async()=>{
   const p=await page(width,'#school-life');await click(p,'[data-photo="0"]');assert.equal(await p.$$eval('[data-photo-jump]',es=>es.length),14);await click(p,'[data-photo-jump="0"]');await p.keyboard.press('End');assert.equal(await p.$eval('#photo-count',e=>e.textContent),'14 / 14');assert.equal(await p.$$eval('[data-photo-jump][tabindex="0"]',es=>es.length),1);await p.keyboard.press('Home');assert.equal(await p.$eval('#photo-count',e=>e.textContent),'1 / 14');
   await click(p,'#photo-zoom');assert.equal(await p.$eval('#photo-zoom',e=>e.getAttribute('aria-pressed')),'true');assert.equal(await p.$eval('.lightbox-stage',e=>e.scrollWidth>e.clientWidth),true);await p.keyboard.press('ArrowRight');assert.equal(await p.$eval('#photo-count',e=>e.textContent),'1 / 14');await click(p,'#photo-zoom');assert.equal(await p.$eval('#photo-zoom',e=>e.getAttribute('aria-pressed')),'false');await noOverflow(p);assert.deepEqual(await axe(p),[]);await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.matches('[data-photo="0"]'));await close(p);
  });
  await test('filtered galleries keep thumbnails in sync with their actual collection',async()=>{
   const p=await page(375,'#school-life');await click(p,'[data-filter=learning]');await click(p,'[data-photo="0"]');assert.equal(await p.$$eval('[data-photo-jump]',es=>es.length),4);await click(p,'[data-photo-jump="3"]');assert.equal(await p.$eval('#photo-count',e=>e.textContent),'4 / 4');assert.match(await p.$eval('#large-photo',e=>e.src),/visit005.webp/);await close(p);
  });
  await test('offline opt-in caches the versioned v3 runtime and supports a complete enquiry',async()=>{
   const p=await page();await p.evaluate(()=>showOfflineTools());await click(p,'#enable-offline');await p.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Offline website ready'));
   await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.setOfflineMode(true);await p.reload({waitUntil:'networkidle0'});await planner(p,{date:'',time:''});assert.match(await p.$eval('#visit-summary',e=>e.value),/PERSONAL VISIT ENQUIRY/);assert.equal(await p.evaluate(()=>localStorage.length),0);await p.setOfflineMode(false);await close(p);
  });
  await test('all tiny thumbnails exist and original photo counts and resources are intact',async()=>{
   const p=await page();const data=await p.evaluate(()=>({photos:photos.map(p=>p.file),slides:heroSlides.length,resources:resources.length}));assert.equal(data.photos.length,14);assert.equal(data.slides,12);assert.equal(data.resources,17);for(const f of data.photos){const file=path.join(__dirname,'..','assets',f+'--160.webp');assert.ok(fs.statSync(file).size<20000)}await close(p);
  });
 } finally {await browser.close();await new Promise(r=>server.close(r))}
 console.log(`\n${passed} premium checks passed; ${failed} failed`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
