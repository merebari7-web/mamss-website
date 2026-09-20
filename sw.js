/* Public offline shell only. Cross-origin/private portals are never intercepted. */
const CACHE='mamss-public-v6-fix-20260920';
const ROOT=new URL('./',self.location.href).href;
const ROOT_PATH=new URL(ROOT).pathname;
const SHELL=['./','index.html','styles.css','features.css','advanced.css','motion.css','fonts.css','app.js','features.js','advanced.js','motion.js','manifest.webmanifest','assets/crest.webp','assets/app-icon-192.png','assets/app-icon-512.png','assets/font-0.woff2','assets/font-1.woff2','assets/font-2.woff2','assets/font-3.woff2','assets/font-4.woff2','assets/visit035.webp','assets/visit035--480.webp','assets/visit035--900.webp'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new URL(path,ROOT).href))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mamss-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
let offlineDisabled=false;
self.addEventListener('message',event=>{if(event.data?.type==='DISABLE_OFFLINE')offlineDisabled=true;});
self.addEventListener('fetch',event=>{
 if(offlineDisabled)return;
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.search)return;
 const isHome=url.pathname===ROOT_PATH||url.pathname===ROOT_PATH+'index.html';
 const isAsset=url.pathname.startsWith(ROOT_PATH+'assets/')&&/\.(webp|png|woff2)$/.test(url.pathname);
 const isShell=SHELL.some(path=>new URL(path,ROOT).pathname===url.pathname);
 if(!isHome&&!isAsset&&!isShell)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(isHome){try{const fresh=await fetch(request);if(fresh.ok)await cache.put(new URL('index.html',ROOT).href,fresh.clone());return fresh;}catch{return await cache.match(new URL('index.html',ROOT).href)||Response.error();}}
  const cached=await cache.match(request);
  if(cached)return cached;
  try{const fresh=await fetch(request);if(fresh.ok&&fresh.type==='basic')await cache.put(request,fresh.clone());return fresh;}catch{return Response.error();}
 })());
});
