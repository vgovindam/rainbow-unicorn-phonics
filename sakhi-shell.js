(function(){
'use strict';

const PARENT_HASH='8578956985bec6d251df470861420ae371eed8fb6e1f873014b2715f9327dbcc';
const SESSION_KEY='sakhiParentUnlocked';
const SESSION_TIME_KEY='sakhiParentUnlockedAt';

async function sha256(v){
  const data=new TextEncoder().encode(v);
  const hash=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function verifyPasscode(value){return (await sha256(String(value||'').trim()))===PARENT_HASH;}

function parentUnlocked(){
  const started=Number(sessionStorage.getItem(SESSION_TIME_KEY)||0);
  const minutes=Number(window.RAINBOW_CONFIG?.parentSessionMinutes||15);
  const valid=sessionStorage.getItem(SESSION_KEY)==='1'&&Date.now()-started<minutes*60000;
  if(!valid)lockParent();
  return valid;
}
function lockParent(){sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(SESSION_TIME_KEY);}

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
    const ok=await verifyPasscode(val);
    if(!ok){window.SakhiEvents?.emit('AUTH_FAILURE',{area:'parent'});msg.textContent='That passcode did not match.';gate.querySelector('#parentPasscode').select();return;}
    sessionStorage.setItem(SESSION_KEY,'1');sessionStorage.setItem(SESSION_TIME_KEY,String(Date.now()));window.SakhiEvents?.emit('PARENT_UNLOCK',{expiresInMinutes:Number(window.RAINBOW_CONFIG?.parentSessionMinutes||15)});close();
    if(typeof window.go==='function')window.go('parent');
  };
  gate.querySelector('#parentPasscode').addEventListener('keydown',e=>{if(e.key==='Enter')gate.querySelector('#parentUnlockBtn').click();});
}

function openParentGate(){
  ensureParentGate();
  const gate=document.getElementById('parentGate'); gate.classList.remove('hidden');
  setTimeout(()=>document.getElementById('parentPasscode')?.focus(),30);
}
window.openParentGate=openParentGate;
window.lockSakhiParent=()=>{lockParent();if(typeof window.go==='function')window.go('home');};
window.SakhiParent={parentUnlocked,openParentGate,lock:lockParent,verifyPasscode};

function ensureFamilySyncCard(){
 const parent=document.getElementById('parent');if(!parent||document.getElementById('familySyncCard'))return;
 const card=document.createElement('div');
 card.id='familySyncCard';
 card.className='card family-sync sakhi-family-sync';
 card.innerHTML='<h3>☁️ Family Progress Sync</h3><p>Checking your secure family connection…</p><div class="family-sync-status">Please wait a moment.</div>';
 const slot=document.getElementById('familySyncSlot');
 (slot||parent).appendChild(card);
}

function bindKingdoms(){
 document.querySelectorAll('[data-domain]').forEach(button=>button.addEventListener('click',()=>{
   window.go?.('learn');
   setTimeout(()=>window.openDomain?.(button.dataset.domain),40);
 }));
}

function showParentPanel(id){
 document.querySelectorAll('[data-parent-panel]').forEach(button=>button.classList.toggle('active',button.dataset.parentPanel===id));
 document.querySelectorAll('[data-parent-content]').forEach(panel=>{
   const active=panel.dataset.parentContent===id;
   panel.classList.toggle('active',active);
   panel.hidden=!active;
 });
}

function bindParentTabs(){
 document.querySelectorAll('[data-parent-panel]').forEach(button=>button.addEventListener('click',()=>showParentPanel(button.dataset.parentPanel)));
 showParentPanel('overview');
}

function init(){ensureParentGate();ensureFamilySyncCard();bindKingdoms();bindParentTabs();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
