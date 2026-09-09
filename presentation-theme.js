(()=>{
'use strict';

const guides={
  reading:{name:'Sakhi Unicorn',role:'Reading magic',kind:'unicorn',image:'assets/magic/reading-unicorn.svg'},
  math:{name:'Gem Princess',role:'Number magic',kind:'princess',image:'assets/magic/math-princess.svg'},
  language:{name:'Book Princess',role:'Story magic',kind:'book',image:'assets/magic/story-princess.svg'},
  logic:{name:'Star Fairy',role:'Puzzle magic',kind:'fairy',image:'assets/magic/logic-fairy.svg'},
  science:{name:'Coral Mermaid',role:'Discovery magic',kind:'mermaid',image:'assets/magic/science-mermaid.svg'},
  writing:{name:'Lantern Princess',role:'Writing magic',kind:'lantern',image:'assets/magic/writing-princess.svg'}
};

function icon(kind){
  const common='viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"';
  if(kind==='unicorn')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#f5eaff"/><path d="M35 7l7 18-12-2z" fill="#ffd35e"/><path d="M18 29c2-11 13-17 24-12 8 4 11 13 7 22-4 10-17 16-28 9-7-5-7-13-3-19z" fill="#fff" stroke="#8b62c6" stroke-width="2"/><path d="M17 27c-7 1-10 5-10 10 5-4 10-5 15-2" fill="none" stroke="#e96db3" stroke-width="5" stroke-linecap="round"/><circle cx="42" cy="30" r="2.4" fill="#35264c"/></svg>`;
  if(kind==='mermaid')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#dcf9ff"/><circle cx="32" cy="20" r="10" fill="#f6c7a8"/><path d="M22 18c2-9 17-12 22-2-7-3-14-2-22 2z" fill="#7d4c9f"/><path d="M25 31c8-5 15-5 20 0l-6 10c6 6 6 12 1 17-2-7-7-10-12-12-5-3-7-8-3-15z" fill="#4ec3c7"/></svg>`;
  if(kind==='fairy')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#f8eaff"/><path d="M31 10l4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1z" fill="#ffd15f"/><circle cx="31" cy="36" r="9" fill="#f3c3a6"/><path d="M23 43c7 5 14 5 20 0l5 12H18z" fill="#d889dc"/></svg>`;
  if(kind==='book')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#fff0f5"/><circle cx="32" cy="18" r="9" fill="#f3c3a6"/><path d="M23 17c2-9 16-11 19-1-7-3-13-2-19 1z" fill="#7e4c9b"/><path d="M19 31q13-8 26 0v18q-13-6-26 0z" fill="#fff" stroke="#8a62b8" stroke-width="2"/></svg>`;
  if(kind==='lantern')return `<svg ${common}><rect width="64" height="64" rx="18" fill="#fff1e5"/><circle cx="31" cy="20" r="10" fill="#f3c3a6"/><path d="M21 18c2-10 16-12 21-2-7-2-13-2-21 2z" fill="#6e4ba0"/><path d="M20 34q11-8 22 0l7 19H13z" fill="#d79adf"/></svg>`;
  return `<svg ${common}><rect width="64" height="64" rx="18" fill="#fff3d9"/><circle cx="32" cy="20" r="10" fill="#f3c3a6"/><path d="M20 34q12-9 24 0l7 20H13z" fill="#cf83d9"/><path d="M20 11l4 5 8-8 8 8 4-5 3 11H17z" fill="#ffd35f"/></svg>`;
}

function domainFromCard(card){
  if(card.dataset.openDomain)return card.dataset.openDomain;
  if(card.dataset.domain)return card.dataset.domain;
  const text=(card.querySelector('small')?.textContent||'').toLowerCase();
  return Object.keys(guides).find(d=>text.includes(d))||null;
}

function installImage(card,domain){
  if(!card||!domain)return;
  const g=guides[domain];if(!g)return;
  const visual=card.querySelector('.kingdom-visual,.quest-visual');
  if(!visual||visual.dataset.magicImage===domain)return;
  visual.dataset.magicImage=domain;
  visual.innerHTML=`<img class="magic-scene-image" src="${g.image}" alt="${g.name} ${g.role}" loading="lazy" decoding="async">`;
}

function addChip(card,domain){
  if(!card||!domain||card.querySelector('.theme-guide-chip'))return;
  const g=guides[domain];if(!g)return;
  const chip=document.createElement('span');chip.className='theme-guide-chip';
  chip.innerHTML=`<span class="mini-avatar">${icon(g.kind)}</span><span>${g.name}</span>`;
  card.appendChild(chip);
}

function decorateCards(){
  document.querySelectorAll('.kingdom-card,.quest-card').forEach(card=>{
    const domain=domainFromCard(card);installImage(card,domain);addChip(card,domain);
  });
}

function buildGuideStrip(){
  const host=document.getElementById('magicGuideStrip');if(!host||host.dataset.ready)return;
  host.dataset.ready='1';
  const featured=['reading','math','language','science'];
  host.innerHTML=featured.map(domain=>{const g=guides[domain];return `<div class="magic-guide-card"><img src="${g.image}" alt="${g.name}" class="magic-guide-photo"><div class="magic-guide-copy"><b>${g.name}</b><small>${g.role}</small></div></div>`}).join('');
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
