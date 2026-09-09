const BUILD='2026.09.09-v3.0';
const CACHE=`sakhi-v3-${BUILD}`;
const CORE=['./','./index.html','./sakhi-v3.css?v=20260909v30','./cloud-auth-v3.css?v=20260909v30','./sakhi-v3.js?v=20260909v30','./cloud-auth-v3.js?v=20260909v30','./supabase-config.js?v=20260909v30','./manifest.json?v=20260909v30','./unicorn-icon.svg','./assets/magic/reading-unicorn.svg','./assets/magic/math-princess.svg','./assets/magic/logic-fairy.svg','./assets/magic/science-mermaid.svg','./assets/magic/story-princess.svg','./assets/magic/writing-princess.svg','./assets/sakhi-storybook-atlas-v2.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('sakhi-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(url.hostname.includes('supabase.co')||url.hostname.includes('raw.githubusercontent.com')||url.hostname.includes('cdn.jsdelivr.net'))return;
 if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return res}).catch(()=>caches.match('./index.html')));return}
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok&&url.origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));
});