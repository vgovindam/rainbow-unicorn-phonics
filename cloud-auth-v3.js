(()=>{
'use strict';
const cfg=()=>window.RAINBOW_CONFIG||{};
const client=()=>window.supabase&&cfg().supabaseUrl?window.supabase.createClient(cfg().supabaseUrl,cfg().supabaseAnonKey):null;
let sb=null;
function host(){return document.getElementById('cloudConnectPanel')}
async function render(){
  const h=host();
  if(!h)return;
  sb=sb||client();
  if(!sb){h.innerHTML='<small>Cloud connection is unavailable.</small>';return}
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    h.innerHTML=`<div class="cloud-connect-card"><div><b>☁️ Cloud progress connected</b><small>${session.user.email||'Signed in'} · Sakhi can restore learner history on your other devices.</small></div><button class="soft-btn" id="cloudSignOut">Sign out</button></div>`;
    document.getElementById('cloudSignOut').onclick=async()=>{await sb.auth.signOut();location.reload()};
    return;
  }
  h.innerHTML=`<div class="cloud-connect-card"><div><b>☁️ Keep progress on iPad, phone & Mac</b><small>Use the same parent email on each device. We will email you a secure sign-in link/code.</small></div><div class="cloud-form"><input id="cloudEmail" type="email" autocomplete="email" placeholder="Parent email"><button class="magic-btn" id="cloudConnect">Connect cloud</button></div><small id="cloudMessage"></small></div>`;
  document.getElementById('cloudConnect').onclick=async()=>{
    const email=document.getElementById('cloudEmail').value.trim();
    const msg=document.getElementById('cloudMessage');
    if(!email){msg.textContent='Enter your parent email.';return}
    msg.textContent='Sending secure sign-in…';
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split('#')[0]}});
    msg.textContent=error?`Could not connect: ${error.message}`:'Check your email, then return to Sakhi on this device.';
  };
}
const observer=new MutationObserver(()=>{if(document.body?.dataset.view==='parents')render().catch(console.warn)});
document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{attributes:true,attributeFilter:['data-view']});render().catch(console.warn)});
})();