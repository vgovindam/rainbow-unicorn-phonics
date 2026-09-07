(function(){
'use strict';

const PARENT_HASH='8578956985bec6d251df470861420ae371eed8fb6e1f873014b2715f9327dbcc';
const SESSION_KEY='sakhiParentUnlocked';

async function sha256(v){
  const data=new TextEncoder().encode(v);
  const hash=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function parentUnlocked(){return sessionStorage.getItem(SESSION_KEY)==='1';}
function lockParent(){sessionStorage.removeItem(SESSION_KEY);}

function ensureParentGate(){
  if(document.getElementById('parentGate'))return;
  const gate=document.createElement('div');
  gate.id='parentGate'; gate.className='parent-gate hidden';
  gate.innerHTML=`<div class="parent-gate-card" role="dialog" aria-modal="true" aria-labelledby="parentGateTitle">
    <button class="parent-close" type="button" aria-label="Close">×</button>
    <div class="parent-lock-icon">🔒</div>
    <h2 id="parentGateTitle">Parents only</h2>
    <p>Enter your parent passcode.</p>
    <input id="parentPasscode" inputmode="numeric" autocomplete="off" maxlength="6" type="password" aria-label="Parent passcode" placeholder="••••••">
    <button id="parentUnlockBtn" class="btn primary" type="button">Unlock</button>
    <div id="parentGateMsg" class="parent-gate-msg" aria-live="polite"></div>
  </div>`;
  document.body.appendChild(gate);
  const close=()=>{gate.classList.add('hidden');document.getElementById('parentPasscode').value='';document.getElementById('parentGateMsg').textContent='';};
  gate.querySelector('.parent-close').onclick=close;
  gate.addEventListener('click',e=>{if(e.target===gate)close();});
  gate.querySelector('#parentUnlockBtn').onclick=async()=>{
    const val=gate.querySelector('#parentPasscode').value.trim();
    const msg=gate.querySelector('#parentGateMsg');
    if(!val){msg.textContent='Enter the passcode.';return;}
    const ok=(await sha256(val))===PARENT_HASH;
    if(!ok){msg.textContent='That passcode did not match.';gate.querySelector('#parentPasscode').select();return;}
    sessionStorage.setItem(SESSION_KEY,'1'); close();
    if(typeof window.__sakhiGo==='function')window.__sakhiGo('parent');
  };
  gate.querySelector('#parentPasscode').addEventListener('keydown',e=>{if(e.key==='Enter')gate.querySelector('#parentUnlockBtn').click();});
}

function openParentGate(){
  ensureParentGate();
  const gate=document.getElementById('parentGate'); gate.classList.remove('hidden');
  setTimeout(()=>document.getElementById('parentPasscode')?.focus(),30);
}
window.openParentGate=openParentGate;
window.lockSakhiParent=()=>{lockParent(); if(typeof window.__sakhiGo==='function')window.__sakhiGo('home');};

function ensureFamilySyncCard(){
 const parent=document.getElementById('parent');if(!parent||document.getElementById('familySyncCard'))return;
 const card=document.createElement('div');
 card.id='familySyncCard';
 card.className='card family-sync sakhi-family-sync';
 card.innerHTML='<h3>☁️ Family Progress Sync</h3><p>Checking your secure family connection…</p><div class="family-sync-status">Please wait a moment.</div>';
 const lockRow=parent.querySelector('.parent-lock-row');
 const firstGrid=parent.querySelector('.grid');
 if(lockRow)lockRow.after(card);else if(firstGrid)firstGrid.before(card);else parent.appendChild(card);
}

function simplifyHome(){
 const home=document.getElementById('home'); if(!home)return;
 const old=home.querySelector('.section-title'); if(old)old.style.display='none';
 home.querySelectorAll('.grid,.priority-grid,.scene-gallery').forEach((el,i)=>{if(i<3)el.classList.add('sakhi-secondary-content');});
 let intro=document.getElementById('sakhiChildHome');
 if(!intro){
   intro=document.createElement('section'); intro.id='sakhiChildHome'; intro.className='sakhi-child-home';
   intro.innerHTML=`
    <div class="sakhi-guide">
      <div class="sakhi-avatar" aria-hidden="true">✨</div>
      <div><span class="sakhi-kicker">SAKHI MAGIC LEARNING</span><h2>Ready for today's magical adventure?</h2><p>Listen, touch, move, build, discover.</p></div>
    </div>
    <button class="sakhi-start" type="button">🌈 START MY ADVENTURE</button>
    <div class="sakhi-kingdoms">
      <button data-kind="reading"><span>📚</span><b>Story Kingdom</b></button>
      <button data-kind="math"><span>🔢</span><b>Number Kingdom</b></button>
      <button data-kind="logic"><span>🧩</span><b>Puzzle Palace</b></button>
      <button data-kind="science"><span>🔬</span><b>Discovery World</b></button>
      <button data-kind="creativity"><span>🎨</span><b>Create & Play</b></button>
    </div>`;
   home.prepend(intro);
   intro.querySelector('.sakhi-start').onclick=()=>window.__sakhiGo?.('quest');
   intro.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const d=b.dataset.kind;if(typeof openDomain==='function'){window.__sakhiGo?.('learn');setTimeout(()=>openDomain(d),40);}});
 }
}

function rebrand(){
 document.title='Sakhi Magic Learning';
 const apple=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(apple)apple.content='Sakhi Magic Learning';
 const h=document.querySelector('.hero h1');if(h)h.innerHTML='<span class="rainbow">Sakhi</span><br/>Magic Learning';
 const p=document.querySelector('.hero p');if(p)p.textContent='A magical, personalized learning adventure that grows with your child.';
 const eye=document.querySelector('.hero .eyebrow');if(eye)eye.textContent='✨ Meet Sakhi, your magical learning friend';
 const heroBtns=document.querySelector('.hero .row');if(heroBtns)heroBtns.innerHTML='<button class="btn primary" onclick="go(\'quest\')">🌈 Start My Adventure</button>';
 document.querySelectorAll('.nav [data-go="parent"],.bottom [data-go="parent"]').forEach(b=>{b.innerHTML=b.closest('.bottom')?'<span>🔒</span>Parents':'🔒 Parents';});
 const parentTitle=document.querySelector('#parent .section-title h2');if(parentTitle)parentTitle.textContent='🔒 Parents';
}

function installParentGuard(){
 const base=window.go; if(typeof base!=='function')return;
 window.__sakhiGo=base;
 window.go=function(id){
   if(id==='parent'&&!parentUnlocked()){openParentGate();return;}
   return base(id);
 };
 document.querySelectorAll('[data-go="parent"]').forEach(b=>{b.onclick=e=>{e.preventDefault();window.go('parent');};});
}

function init(){rebrand();installParentGuard();simplifyHome();ensureParentGate();ensureFamilySyncCard();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
