/* Lightweight, native-scroll 3D. No scroll hijacking, WebGL, libraries, or perpetual RAF. */
(() => {
 'use strict';
 const root=document.documentElement;
 const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
 const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
 const supports3D=CSS.supports('transform','perspective(1000px) rotateX(5deg)');
 const records=new Map(),active=new Set(),held=new Set();
 let holdingHero=false;
 let enabled=false,raf=0,needsMeasure=true,needsDiscovery=false,hovered=null,heroProgress=0;
 let heroTop=0,heroHeight=650,viewport=innerHeight,lastScrollY=scrollY;
 const hero=document.querySelector('.hero');
 const heroVisual=document.querySelector('.hero-visual');
 const heroCopy=document.querySelector('.hero-copy');
 const controls=document.querySelector('.hero-carousel-controls');
 const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
 const ease=v=>1-Math.pow(1-v,3);
 const smallScreen=()=>innerWidth<=600;
 const isPaused=()=>document.hidden||!!document.querySelector('dialog[open]');

 const frame=document.createElement('span');frame.className='depth-frame';frame.setAttribute('aria-hidden','true');heroVisual.prepend(frame);
 const orbit=document.createElement('span');orbit.className='depth-orbit';orbit.setAttribute('aria-hidden','true');orbit.innerHTML='<i></i><i></i><i></i><span></span>';heroVisual.prepend(orbit);
 const toggle=document.createElement('button');toggle.id='scroll-fx-toggle';toggle.type='button';controls.setAttribute('aria-label','Photo slideshow and 3D scroll effects');controls.append(toggle);

 function layoutTop(element){let top=0,node=element;while(node){top+=node.offsetTop||0;node=node.offsetParent;}return top;}
 function setNumber(el,name,value,unit='',precision=3){
  const next=value.toFixed(precision)+unit;
  if(el.style.getPropertyValue(name)!==next)el.style.setProperty(name,next);
 }
 const intersection='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  entries.forEach(entry=>{const record=records.get(entry.target);if(!record)return;record.inView=entry.isIntersecting;if(entry.isIntersecting)active.add(record);else active.delete(record);});
  schedule();
 },{rootMargin:'220px 0px 220px 0px',threshold:0}):null;
 function register(element,kind,index){
  if(records.has(element)||element.closest('dialog'))return;
  const record={el:element,kind,index,top:0,height:0,progress:0,maxProgress:0,initialized:false,inView:true,rx:0,ry:0,tx:0,ty:0};
  records.set(element,record);active.add(record);
  element.classList.add(kind==='card'?'motion-card':kind==='photo'?'motion-photo':'motion-reveal');
  intersection?.observe(element);
 }
 function discover(){
  document.querySelectorAll('.section-heading').forEach((el,i)=>register(el.querySelector('button, a, input, select')?el.firstElementChild:el,'reveal',i));
  document.querySelectorAll('.principal-copy, .principal-photo, .purpose-grid>article, .core-values, .why-section>div:first-child, .student-grid>article, .school-workspace, .contact-grid>div:first-child').forEach((el,i)=>register(el,'reveal',i));
  document.querySelectorAll('.value-grid>article, .learning-card, .leadership-grid>article, .gallery-item, .testimonial-cards>article, .news-card, .resource-card').forEach((el,i)=>register(el,'card',i));
  document.querySelectorAll('.image-wrap>img, .gallery-item>img').forEach((el,i)=>register(el,'photo',i));
  for(const [el,record] of records){if(!el.isConnected){intersection?.unobserve(el);records.delete(el);active.delete(record);if(hovered===record)hovered=null;}}
  needsDiscovery=false;needsMeasure=true;
 }
 function measure(){
  viewport=innerHeight;heroTop=layoutTop(hero);heroHeight=hero.offsetHeight;
  for(const record of records.values()){
   record.top=layoutTop(record.el);record.height=record.el.offsetHeight;
   const top=record.top-scrollY;record.inView=top<viewport+220&&top+record.height>-220;
   if(record.inView)active.add(record);else active.delete(record);
   if(!record.initialized){
    const raw=clamp((viewport*.96-top)/(viewport*.52)-(smallScreen()?0:(record.index%3)*.035));
    record.progress=raw;record.maxProgress=raw;record.initialized=true;
    paint(record);
   }
  }
  needsMeasure=false;
 }
 function paint(record){
  const el=record.el;
  if(record.kind==='photo'){
   const center=record.top+record.height/2-scrollY;
   const photoProgress=clamp((viewport-center)/(viewport+record.height/2));
   setNumber(el,'--photo-y',(photoProgress-.5)*(smallScreen()?10:16),'px');return;
  }
  const remaining=1-ease(record.progress),mobile=smallScreen();
  setNumber(el,'--reveal-y',remaining*(mobile?26:58),'px');
  setNumber(el,'--reveal-z',remaining*(mobile?-25:-110),'px');
  setNumber(el,'--reveal-rx',remaining*(mobile?4:12),'deg');
  setNumber(el,'--reveal-ry',remaining*(mobile?1.2:4)*(record.index%2?1:-1),'deg');
  setNumber(el,'--reveal-opacity',1); // Keep text contrast intact throughout the reveal.
  if(record.kind==='card'){
   setNumber(el,'--tilt-rx',record.rx,'deg');setNumber(el,'--tilt-ry',record.ry,'deg');setNumber(el,'--shadow-x',-record.ry*1.5,'px');
  }
 }
 function render(){
  raf=0;
  if(enabled&&(reduceQuery.matches||root.dataset.motion==='reduce'||root.dataset.depth==='off')){syncPreferences();return;}
  if(!enabled||isPaused())return;
  if(needsDiscovery)discover();
  if(needsMeasure)measure();
  const currentY=scrollY,mobile=smallScreen();let unsettled=false;
  if(!intersection){for(const record of records.values()){const top=record.top-currentY;record.inView=top<viewport+220&&top+record.height>-220;if(record.inView)active.add(record);else active.delete(record);}}
  const heroTarget=clamp((currentY-heroTop+90)/Math.max(heroHeight,1));
  if(!holdingHero&&heroTop+heroHeight>currentY-100&&heroTop<currentY+viewport){
   heroProgress+=(heroTarget-heroProgress)*.17;
   if(Math.abs(heroTarget-heroProgress)>.001)unsettled=true;else heroProgress=heroTarget;
   setNumber(heroVisual,'--hero-y',heroProgress*(mobile?16:46),'px');
   setNumber(heroVisual,'--hero-rx',(mobile?1.4:3.5)-heroProgress*(mobile?3:9),'deg');
   setNumber(heroVisual,'--hero-ry',(mobile?-1.5:-5)+heroProgress*(mobile?2:8),'deg');
   setNumber(heroVisual,'--seal-y',-heroProgress*(mobile?10:35),'px');
   setNumber(heroVisual,'--seal-rz',-13+heroProgress*19,'deg');
   setNumber(heroVisual,'--caption-y',-heroProgress*12,'px');
   setNumber(heroVisual,'--label-y',-heroProgress*17,'px');
   setNumber(heroVisual,'--orbit-y',-heroProgress*62,'px');
   setNumber(heroVisual,'--orbit-rz',-25+heroProgress*85,'deg');
   setNumber(heroCopy,'--copy-y',-heroProgress*(mobile?5:25),'px');
  }
  for(const record of active){
   if(held.has(record))continue;
   const raw=clamp((viewport*.96-(record.top-currentY))/(viewport*.52)-(mobile?0:(record.index%3)*.035));
   // Reveals only progress forward; reading never disappears on an upward scroll.
   record.maxProgress=Math.max(record.maxProgress,raw);
   record.progress+=(record.maxProgress-record.progress)*.19;
   if(Math.abs(record.maxProgress-record.progress)>.001)unsettled=true;else record.progress=record.maxProgress;
   if(record.kind==='card'){
    const targetX=record===hovered?record.tx:0,targetY=record===hovered?record.ty:0;
    record.rx+=(targetX-record.rx)*.15;record.ry+=(targetY-record.ry)*.15;
    if(Math.abs(targetX-record.rx)>.01||Math.abs(targetY-record.ry)>.01)unsettled=true;
    else{record.rx=targetX;record.ry=targetY;}
   }
   paint(record);
  }
  lastScrollY=currentY;
  if(unsettled)raf=requestAnimationFrame(render);
 }
 function schedule(){const allowed=supports3D&&!reduceQuery.matches&&root.dataset.motion!=='reduce'&&root.dataset.depth!=='off';if(allowed!==enabled){syncPreferences();return;}if(enabled&&!isPaused()&&!raf)raf=requestAnimationFrame(render);}
 function resetHover(){if(hovered){hovered.el.classList.remove('motion-hovered');hovered.tx=hovered.ty=0;hovered=null;schedule();}}
 function syncPreferences(){
  const reduced=reduceQuery.matches||root.dataset.motion==='reduce';
  enabled=supports3D&&!reduced&&root.dataset.depth!=='off';
  root.dataset.scrollFx=enabled?'on':'off';
  toggle.setAttribute('aria-pressed',String(enabled));
  toggle.textContent=!supports3D?'3D unavailable':reduced?'3D paused':enabled?'3D on':'3D off';
  toggle.title=reduced?'3D effects are paused by your reduced-motion preference.':'Toggle layered 3D scrolling';
  toggle.setAttribute('aria-label',reduced?'3D effects paused for reduced motion':enabled?'Turn off 3D scroll effects':'Turn on 3D scroll effects');
  toggle.disabled=!supports3D;
  if(!enabled){cancelAnimationFrame(raf);raf=0;resetHover();}
  else{needsDiscovery=true;needsMeasure=true;schedule();}
 }
 toggle.addEventListener('click',()=>{
  if(reduceQuery.matches||root.dataset.motion==='reduce'){toast('3D effects respect reduced motion. Adjust your reading or device settings to enable them.');return;}
  deskState.settings.depth=!(deskState.settings.depth!==false);applyReadingSettings();commitDesk();syncPreferences();
  toast(enabled?'3D scrolling enabled. Scroll to explore.':'3D effects turned off. All content remains available.');
 });
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',()=>{needsMeasure=true;schedule();},{passive:true});
 addEventListener('orientationchange',()=>{needsMeasure=true;schedule();});
 document.addEventListener('pointermove',event=>{
  if(!enabled||!finePointer.matches||smallScreen()||isPaused())return;
  const el=event.target.closest('.motion-card');const record=el?records.get(el):null;
  if(record!==hovered){resetHover();hovered=record;if(hovered)hovered.el.classList.add('motion-hovered');}
  if(!record)return;
  const rect=el.getBoundingClientRect();
  record.tx=-clamp((event.clientY-rect.top)/Math.max(rect.height,1)-.5,-.5,.5)*8;
  record.ty=clamp((event.clientX-rect.left)/Math.max(rect.width,1)-.5,-.5,.5)*10;
  active.add(record);schedule();
 },{passive:true});
 document.addEventListener('pointerleave',resetHover,{passive:true});
 addEventListener('blur',resetHover);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;resetHover();}else{needsMeasure=true;schedule();}});
 document.addEventListener('focusin',event=>{
  resetHover();
  if(event.target.matches(':focus-visible')){for(const record of records.values()){if(record.el.contains(event.target)){record.progress=record.maxProgress=1;record.rx=record.ry=record.tx=record.ty=0;paint(record);}}}
  schedule();
 });
 document.addEventListener('pointerdown',event=>{for(const record of records.values())if(record.el.contains(event.target))held.add(record);holdingHero=heroVisual.contains(event.target);},{capture:true,passive:true});
 const release=()=>{held.clear();holdingHero=false;schedule();};
 document.addEventListener('pointerup',release,{passive:true});
 document.addEventListener('pointercancel',release,{passive:true});
 reduceQuery.addEventListener('change',syncPreferences);
 finePointer.addEventListener('change',resetHover);
 new MutationObserver(syncPreferences).observe(root,{attributes:true,attributeFilter:['data-motion','data-depth']});
 const changes=new MutationObserver(mutations=>{
  if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1))){needsDiscovery=true;schedule();}
 });
 changes.observe(document.querySelector('main'),{childList:true,subtree:true});
 document.querySelectorAll('dialog').forEach(dialog=>new MutationObserver(()=>{if(dialog.open){resetHover();cancelAnimationFrame(raf);raf=0;}else{needsMeasure=true;schedule();}}).observe(dialog,{attributes:true,attributeFilter:['open']}));
 if('ResizeObserver' in window)new ResizeObserver(()=>{needsMeasure=true;schedule();}).observe(document.body);
 document.fonts?.ready.then(()=>{needsMeasure=true;schedule();});
 addEventListener('load',()=>{needsMeasure=true;schedule();},{once:true});
 discover();syncPreferences();
 // Small read-only diagnostic interface for checking that the animation goes idle.
 window.MAMSSMotion={status:()=>({enabled,reduced:reduceQuery.matches||root.dataset.motion==='reduce',registered:records.size,active:active.size,framePending:!!raf,scrollY:lastScrollY}),refresh:()=>{needsDiscovery=true;needsMeasure=true;schedule();}};
})();
