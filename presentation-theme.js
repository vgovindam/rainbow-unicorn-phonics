(()=>{
'use strict';

const guides={
  reading:{name:'Sakhi Unicorn',role:'Reading magic',kind:'unicorn'},
  math:{name:'Gem Princess',role:'Number magic',kind:'princess'},
  language:{name:'Book Princess',role:'Story magic',kind:'book'},
  logic:{name:'Star Fairy',role:'Puzzle magic',kind:'fairy'},
  science:{name:'Coral Mermaid',role:'Discovery magic',kind:'mermaid'},
  writing:{name:'Lantern Princess',role:'Writing magic',kind:'lantern'}
};

function icon(kind){
  const common='viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"';
  if(kind==='unicorn')return `<svg ${common}><defs><linearGradient id="u" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#ffd8ef"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#f5eaff"/><path d="M35 7l7 18-12-2z" fill="#ffd35e"/><path d="M18 29c2-11 13-17 24-12 8 4 11 13 7 22-4 10-17 16-28 9-7-5-7-13-3-19z" fill="url(#u)" stroke="#8b62c6" stroke-width="2"/><path d="M17 27c-7 1-10 5-10 10 5-4 10-5 15-2" fill="none" stroke="#e96db3" stroke-width="5" stroke-linecap="round"/><path d="M21 18c-3-5-1-9 3-11 1 6 5 8 7 12" fill="#c995ef"/><circle cx="42" cy="30" r="2.4" fill="#35264c"/><path d="M39 39c3 2 6 2 9 0" fill="none" stroke="#c95f9c" stroke-width="2" stroke-linecap="round"/></svg>`;
  if(kind==='mermaid')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#dcf9ff"/><circle cx="32" cy="20" r="10" fill="#f6c7a8"/><path d="M22 18c2-9 17-12 22-2-7-3-14-2-22 2z" fill="#7d4c9f"/><path d="M25 31c8-5 15-5 20 0l-6 10c6 6 6 12 1 17-2-7-7-10-12-12-5-3-7-8-3-15z" fill="#4ec3c7"/><path d="M39 42c10 0 15 5 16 12-8-4-13-4-18 0" fill="#6b74d9"/><circle cx="28" cy="20" r="1.5" fill="#3e2b4e"/><circle cx="36" cy="20" r="1.5" fill="#3e2b4e"/></svg>`;
  if(kind==='fairy')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#f8eaff"/><path d="M31 10l4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1z" fill="#ffd15f"/><circle cx="31" cy="36" r="9" fill="#f3c3a6"/><path d="M21 34c2-9 16-12 21-2-6-3-13-2-21 2z" fill="#9563cb"/><path d="M23 43c7 5 14 5 20 0l5 12H18z" fill="#d889dc"/><path d="M17 35C7 27 5 17 10 12c7 5 11 11 12 19M45 35c10-8 12-18 7-23-7 5-11 11-12 19" fill="#cdefff" opacity=".85"/></svg>`;
  if(kind==='book')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#fff0f5"/><circle cx="32" cy="18" r="9" fill="#f3c3a6"/><path d="M23 17c2-9 16-11 19-1-7-3-13-2-19 1z" fill="#7e4c9b"/><path d="M19 31q13-8 26 0v18q-13-6-26 0z" fill="#fff" stroke="#8a62b8" stroke-width="2"/><path d="M32 31v18" stroke="#d4b9df" stroke-width="2"/><path d="M24 54c6-3 10-3 16 0" stroke="#e590b3" stroke-width="5" stroke-linecap="round"/></svg>`;
  if(kind==='lantern')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#fff1e5"/><circle cx="31" cy="20" r="10" fill="#f3c3a6"/><path d="M21 18c2-10 16-12 21-2-7-2-13-2-21 2z" fill="#6e4ba0"/><path d="M20 34q11-8 22 0l7 19H13z" fill="#d79adf"/><rect x="43" y="25" width="9" height="15" rx="2" fill="#ffd35f" stroke="#9a6a37" stroke-width="2"/><path d="M47 25v-5" stroke="#9a6a37" stroke-width="2"/></svg>`;
  return `<svg ${common}><rect width="64" height="64" rx="18" fill="#fff3d9"/><circle cx="32" cy="20" r="10" fill="#f3c3a6"/><path d="M21 18c3-10 17-12 22-2-8-2-14-1-22 2z" fill="#7b4a9b"/><path d="M20 34q12-9 24 0l7 20H13z" fill="#cf83d9"/><path d="M20 11l4 5 8-8 8 8 4-5 3 11H17z" fill="#ffd35f" stroke="#d8a637" stroke-width="1.5"/></svg>`;
}

function domainFromCard(card){
  if(card.dataset.openDomain)return card.dataset.openDomain;
  if(card.dataset.domain)return card.dataset.domain;
  const text=(card.querySelector('small')?.textContent||'').toLowerCase();
  return Object.keys(guides).find(d=>text.includes(d))||null;
}

function addChip(card,domain){
  if(!card||!domain||card.querySelector('.theme-guide-chip'))return;
  const g=guides[domain];if(!g)return;
  const chip=document.createElement('span');chip.className='theme-guide-chip';
  chip.innerHTML=`<span class="mini-avatar">${icon(g.kind)}</span><span>${g.name}</span>`;
  card.appendChild(chip);
}

function decorateCards(){
  document.querySelectorAll('.kingdom-card').forEach(card=>addChip(card,domainFromCard(card)));
  document.querySelectorAll('.quest-card').forEach(card=>addChip(card,domainFromCard(card)));
}

function buildGuideStrip(){
  const host=document.getElementById('magicGuideStrip');if(!host||host.dataset.ready)return;
  host.dataset.ready='1';
  const featured=['reading','math','language','science'];
  host.innerHTML=featured.map(domain=>{const g=guides[domain];return `<div class="magic-guide-card"><div class="magic-guide-avatar">${icon(g.kind)}</div><div class="magic-guide-copy"><b>${g.name}</b><small>${g.role}</small></div></div>`}).join('');
}

function applyBrand(){
  const mark=document.querySelector('.brand-mark');if(mark)mark.textContent='🦄';
  const eyebrow=document.querySelector('.hero-copy .eyebrow');if(eyebrow)eyebrow.textContent='🌈 Princess + Unicorn learning magic';
}

function decorate(){applyBrand();buildGuideStrip();decorateCards();}

decorate();
['homeKingdoms','kingdomGrid','questStrip'].forEach(id=>{
  const node=document.getElementById(id);if(node)new MutationObserver(()=>requestAnimationFrame(decorateCards)).observe(node,{childList:true,subtree:true});
});
window.addEventListener('sakhi:view-changed',decorate);
})();
