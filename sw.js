const CACHE='rainbow-magic-learning-v5';
const ASSETS=['./','./index.html','./styles.css','./interactions.css','./visuals.css','./app.js','./scheduler.js','./interaction-engine.js','./visuals.js','./assets/atlas-1.b64','./assets/atlas-2.b64','./assets/atlas-3.b64','./manifest.json','./unicorn-icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
