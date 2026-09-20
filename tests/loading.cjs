/* Branded loading screen: honest readiness, failure recovery, accessibility and privacy. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const pp=require('puppeteer'),serve=require('../scripts/server.cjs');
let passed=0,failed=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function test(name,fn){try{await fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.stack)}}
(async()=>{
 const server=serve('/mamss-website/');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/mamss-website/`;
 const browser=await pp.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 async function page({width=390,height=844,hold='',abort='',hash='',motion=false,noJS=false,scriptError=false,storage=null}={}){
  const c=await browser.createBrowserContext(),p=await c.newPage();p.errors=[];p.held=[];p.on('pageerror',e=>p.errors.push(e.message));await p.setViewport({width,height});if(storage)await p.evaluateOnNewDocument(data=>localStorage.setItem('mamss.desk.v1',JSON.stringify(data)),storage);if(motion)await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);if(noJS)await p.setJavaScriptEnabled(false);
  await p.setRequestInterception(true);p.on('request',r=>{if(hold&&r.url().includes(hold)){p.held.push(r);return}if(abort&&r.url().includes(abort))return r.abort();if(scriptError&&r.url().includes('site.min.js'))return r.respond({status:200,contentType:'application/javascript',body:'throw new Error("Intentional test failure")'});r.continue()});
  p.navigation=p.goto(base+hash,{waitUntil:'load'});p.navigation.catch(()=>{});
  if(noJS)await p.navigation;else await p.waitForFunction(()=>!!window.MAMSSLoading);
  return p;
 }
 async function release(p){for(const r of p.held.splice(0))await r.continue().catch(()=>{});await p.navigation}
 async function close(p,expected=[]){assert.deepEqual(p.errors,expected);await p.browserContext().close()}
 async function finished(p){await p.waitForFunction(()=>MAMSSLoading.state.finished,{timeout:6000});assert.equal(await p.$eval('#mamss-loader',e=>e.open),false);assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('mamss-loading')),false)}
 async function scan(p){await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});return p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))})}
 try{
  await test('critical loader markup, CSS and JS are deterministically embedded in the HTML',async()=>{
   const root=path.join(__dirname,'..'),before=fs.readFileSync(path.join(root,'index.html'),'utf8');cp.execFileSync(process.execPath,['scripts/build.cjs'],{cwd:root});assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),before);assert.ok(before.indexOf('id="mamss-loading-style"')<before.indexOf('id="mamss-styles"'));assert.ok(before.indexOf('id="mamss-loader"')<before.indexOf('id="mamss-runtime"'));assert.equal(/src="loading\.js/.test(before),false);
  });
  await test('normal loading completes all five real checks, then releases the page',async()=>{
   const p=await page();await finished(p);const s=await p.evaluate(()=>MAMSSLoading.state);assert.equal(s.reason,'ready');assert.deepEqual(Object.values(s.checks),Array(5).fill('ready'));assert.equal(await p.$eval('#ml-progress',e=>e.value),5);assert.equal(await p.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.equal(await p.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);await close(p);
  });
  await test('progress waits for the actual application and never advances on a fake timer',async()=>{
   const p=await page({hold:'site.min.js'});await p.waitForFunction(()=>document.querySelector('#ml-progress').value===4);await sleep(600);assert.equal(await p.$eval('#ml-progress',e=>e.value),4);assert.equal(await p.evaluate(()=>MAMSSLoading.state.checks.tools),'pending');assert.equal(await p.$eval('#mamss-loader',e=>e.open),true);await release(p);await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'ready');await close(p);
  });
  for(const [width,height] of [[320,568],[390,844],[768,900],[1440,900]])await test(`${width}px: open loader is accessible and fits the viewport`,async()=>{
   const p=await page({width,height,hold:'site.min.js'});assert.equal(await p.$eval('#mamss-loader',e=>e.scrollWidth>e.clientWidth+1),false);assert.equal(await p.$eval('#mamss-loader',e=>e.scrollHeight>e.clientHeight+1),false);assert.equal(await p.evaluate(()=>document.activeElement.id),'ml-skip');assert.deepEqual(await scan(p),[]);await p.click('#ml-skip');await release(p);await finished(p);await close(p);
  });
  await test('the welcome paints with independent styles while main CSS is still downloading',async()=>{
   const p=await page({hold:'site.min.css'});assert.equal(await p.$eval('#mamss-loader',e=>getComputedStyle(e).display),'grid');assert.equal(await p.$eval('#mamss-loader',e=>getComputedStyle(e).backgroundColor),'rgb(51, 20, 34)');assert.equal(await p.evaluate(()=>MAMSSLoading.state.checks.styles),'pending');await p.click('#ml-skip');await release(p);await finished(p);await close(p);
  });
  await test('Skip is immediate, restores page focus, and late readiness cannot reopen the screen',async()=>{
   const p=await page({hold:'site.min.js'});await p.click('#ml-skip');await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'skipped');assert.equal(await p.evaluate(()=>document.activeElement.id),'main');await release(p);assert.equal(await p.$eval('#mamss-loader',e=>e.open),false);assert.equal(await p.evaluate(()=>MAMSSLoading.state.checks.tools),'pending');await close(p);
  });
  await test('Escape dismisses the modal and keyboard focus cannot reach the obscured page',async()=>{
   const p=await page({hold:'site.min.js'});for(let i=0;i<3;i++){await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id==='ml-skip'||document.activeElement===document.body),true)}await p.keyboard.press('Escape');await finished(p);assert.equal(await p.evaluate(()=>document.activeElement.id),'main');await release(p);await close(p);
  });
  await test('stalled requests hit the 3.5-second safety deadline without pretending to finish',async()=>{
   const p=await page({hold:'site.min.js'});await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'timeout');assert.equal(await p.evaluate(()=>MAMSSLoading.state.checks.tools),'pending');assert.ok(await p.$eval('#ml-progress',e=>e.value<5));await release(p);await close(p);
  });
  for(const file of ['site.min.css','site.min.js'])await test(`missing ${file} dismisses the welcome instead of trapping the visitor`,async()=>{
   const p=await page({abort:file});await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),file.endsWith('css')?'stylesheet-error':'script-error');assert.equal(await p.$eval('#home',e=>e.getClientRects().length>0),true);await close(p);
  });
  await test('a runtime exception also fails open',async()=>{
   const p=await page({scriptError:true});await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'script-error');await close(p,['Intentional test failure']);
  });
  await test('a missing welcome photograph is marked unavailable, not falsely ready',async()=>{
   const p=await page({abort:'visit035'});await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.checks.photo),'unavailable');assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'ready-with-fallback');await close(p);
  });
  await test('font failure uses available type and never blocks access',async()=>{
   const p=await page({abort:'.woff2'});await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.checks.fonts),'unavailable');assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'ready-with-fallback');await close(p);
  });
  await test('a deep link opens its requested chapter without waiting for a hidden hero',async()=>{
   const p=await page({hash:'#admissions',hold:'visit035'});await finished(p);assert.equal(await p.evaluate(()=>MAMSS.current),'admissions');assert.equal(await p.$eval('#ml-view-label',e=>e.textContent),'View');await release(p);await close(p);
  });
  await test('system and school reading preferences both stop decorative animation',async()=>{
   const p=await page({motion:true,hold:'site.min.js'});assert.equal(await p.$eval('.ml-orbit-turn',e=>getComputedStyle(e).animationName),'none');await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await p.evaluate(()=>document.documentElement.dataset.motion='reduce');assert.equal(await p.$eval('.ml-orbit-turn',e=>getComputedStyle(e).animationName),'none');await release(p);await finished(p);assert.equal(await p.$eval('#mamss-loader',e=>e.classList.contains('ml-leaving')),false);await close(p);
  });
  await test('an existing opted-in reduced-motion preference applies before the main app loads',async()=>{
   const data={version:1,consent:true,role:'parent',entry:'JSS 1',tasks:[],favorites:[],reminders:[],settings:{text:'standard',contrast:false,motion:true,depth:false}};
   const p=await page({hold:'site.min.js',storage:data});assert.equal(await p.$eval('.ml-orbit-turn',e=>getComputedStyle(e).animationName),'none');assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('mamss.desk.v1'))),data);await p.click('#ml-skip');await release(p);await close(p);
  });
  await test('without JavaScript the loader stays hidden and school information remains visible',async()=>{
   const p=await page({noJS:true});assert.equal(await p.$eval('#mamss-loader',e=>e.open),false);assert.equal(await p.$eval('#mamss-loader',e=>getComputedStyle(e).display),'none');assert.equal(await p.$eval('#home h1',e=>e.getClientRects().length>0),true);await close(p);
  });
  await test('chapter navigation and history do not replay the loading screen',async()=>{
   const p=await page();await finished(p);await p.evaluate(()=>MAMSS.go('admissions'));await p.evaluate(()=>MAMSS.go('contact'));await p.goBack();assert.equal(await p.$eval('#mamss-loader',e=>e.open),false);assert.equal(await p.evaluate(()=>MAMSS.current),'admissions');await close(p);
  });
  for(const action of ['print','history'])await test(`${action}: restoration clears any remaining loading overlay`,async()=>{
   const p=await page({hold:'site.min.js'});await p.evaluate(a=>window.dispatchEvent(a==='print'?new Event('beforeprint'):new PageTransitionEvent('pageshow',{persisted:true})),action);await finished(p);await release(p);await close(p);
  });
  await test('an opted-in offline reload completes the inline welcome without new dependencies',async()=>{
   const p=await page();await finished(p);await p.evaluate(()=>showOfflineTools());await p.click('#enable-offline');await p.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Offline website ready'));await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.keyboard.press('Escape');await p.setOfflineMode(true);await p.reload({waitUntil:'networkidle0'});await finished(p);assert.equal(await p.evaluate(()=>MAMSSLoading.state.reason),'ready');assert.match(await p.$eval('#ml-network',e=>e.textContent),/Offline/);assert.equal(await p.evaluate(()=>localStorage.length+sessionStorage.length),0);await p.setOfflineMode(false);await close(p);
  });
 }finally{await browser.close();await new Promise(r=>server.close(r))}
 console.log(`\n${passed} loading checks passed; ${failed} failed`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
