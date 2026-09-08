(function () {
  'use strict';
  const memoryCache = new Map();
  const validatedPhonemes = new Map([
    ['m',{cue:'mmmm',status:'needs_manual_audio_validation'}],['s',{cue:'ssss',status:'needs_manual_audio_validation'}],
    ['t',{cue:'t',status:'needs_manual_audio_validation'}],['p',{cue:'p',status:'needs_manual_audio_validation'}],
    ['n',{cue:'nnnn',status:'needs_manual_audio_validation'}],['k',{cue:'k',status:'needs_manual_audio_validation'}],
    ['a',{cue:'short a',status:'needs_manual_audio_validation'}],['e',{cue:'short e',status:'needs_manual_audio_validation'}],
    ['i',{cue:'short i',status:'needs_manual_audio_validation'}],['o',{cue:'short o',status:'needs_manual_audio_validation'}],
    ['u',{cue:'short u',status:'needs_manual_audio_validation'}],['sh',{cue:'shhhh',status:'needs_manual_audio_validation'}],
    ['ch',{cue:'ch',status:'needs_manual_audio_validation'}],['th',{cue:'th',status:'needs_manual_audio_validation'}],
  ]);
  let currentAudio = null;
  let activeRequest = null;
  let lastRequest = null;
  let lastStatus = { provider:'elevenlabs', state:'idle' };
  let sequence = 0;
  const config = () => window.RAINBOW_CONFIG || {};
  const log = (type, detail) => window.SakhiEvents?.emit(type, detail);
  const now = () => window.performance?.now?.() || Date.now();

  class SpeechError extends Error {
    constructor(code, message, detail={}) { super(message); this.name='SpeechError'; this.code=code; this.detail=detail; }
  }

  async function digest(value) {
    if (!window.crypto?.subtle) return encodeURIComponent(value).slice(0,180);
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
    return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function cacheIdentity(text, kind, profile) {
    const c=config();
    return [c.ttsProvider||'elevenlabs',c.ttsConfigVersion||'1',c.ttsInteractiveModel||'',c.ttsStoryModel||'',profile,kind,text].join('|');
  }

  async function cachedUrl(identity) {
    if (memoryCache.has(identity)) return { url:memoryCache.get(identity), source:'memory' };
    if (!window.caches) return null;
    try {
      const cache=await caches.open('sakhi-natural-audio-v1');
      const request=new Request(`${location.origin}/__sakhi_audio_cache__/${await digest(identity)}.mp3`);
      const response=await cache.match(request);
      if (!response) return null;
      const blob=await response.blob();
      if (!blob.size||!blob.type.startsWith('audio/')) return null;
      const url=URL.createObjectURL(blob);memoryCache.set(identity,url);
      return {url,source:'browser'};
    } catch (_) { return null; }
  }

  async function storeAudio(identity, blob) {
    const url=URL.createObjectURL(blob);memoryCache.set(identity,url);
    if (window.caches) {
      try {
        const cache=await caches.open('sakhi-natural-audio-v1');
        const request=new Request(`${location.origin}/__sakhi_audio_cache__/${await digest(identity)}.mp3`);
        await cache.put(request,new Response(blob,{headers:{'content-type':blob.type||'audio/mpeg'}}));
      } catch (_) {}
    }
    return url;
  }

  function stop() {
    sequence += 1;activeRequest?.abort();activeRequest=null;
    if (currentAudio) { try { currentAudio.pause();currentAudio.currentTime=0; } catch (_) {} currentAudio=null; }
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }

  async function responseError(response) {
    let body={};try{body=await response.json();}catch(_){}
    const code=body?.error?.code||(
      response.status===401||response.status===403?'ELEVENLABS_AUTH_FAILURE':
      response.status===404?'ELEVENLABS_VOICE_NOT_FOUND':
      response.status===429?'ELEVENLABS_RATE_LIMIT':'ELEVENLABS_REQUEST_FAILURE');
    return new SpeechError(code,body?.error?.message||`Sakhi narration returned HTTP ${response.status}.`,{httpStatus:response.status,upstreamStatus:body?.error?.upstream_status||null});
  }

  async function requestAudio(text, kind, profile, requestId, bypassCache=false) {
    const c=config();
    if (!c.ttsEndpoint||c.ttsProvider!=='elevenlabs') throw new SpeechError('ELEVENLABS_CONFIGURATION_FAILURE','ElevenLabs speech endpoint is not configured.');
    const identity=cacheIdentity(text,kind,profile);
    if (!bypassCache) {
      const found=await cachedUrl(identity);
      if (found) { const metrics={provider:'elevenlabs',kind,profile,cache:'HIT',cacheSource:found.source};log('AUDIO_CACHE_HIT',metrics);return {url:found.url,metrics}; }
    }
    log('AUDIO_CACHE_MISS',{provider:'elevenlabs',kind,profile});
    const controller=new AbortController();activeRequest=controller;
    const timeout=setTimeout(()=>controller.abort(),15000),started=now();
    try {
      const response=await fetch(c.ttsEndpoint,{method:'POST',signal:controller.signal,headers:{'content-type':'application/json',apikey:c.supabaseAnonKey||''},body:JSON.stringify({text,kind,profile,diagnostic:bypassCache})});
      if(requestId!==sequence)throw new DOMException('Superseded','AbortError');
      if(!response.ok)throw await responseError(response);
      const contentType=response.headers.get('content-type')||'';
      if(!contentType.startsWith('audio/'))throw new SpeechError('ELEVENLABS_REQUEST_FAILURE',`Unsupported narration response: ${contentType||'unknown'}.`);
      const blob=await response.blob();if(!blob.size)throw new SpeechError('ELEVENLABS_REQUEST_FAILURE','ElevenLabs returned empty audio.');
      const metrics={provider:response.headers.get('x-sakhi-provider')||'elevenlabs',voiceId:response.headers.get('x-sakhi-voice-id')||'',voiceName:response.headers.get('x-sakhi-voice-name')||'',model:response.headers.get('x-sakhi-model')||'',outputFormat:response.headers.get('x-sakhi-output-format')||contentType,httpStatus:response.status,latencyMs:Number(response.headers.get('x-sakhi-latency-ms'))||Math.round(now()-started),bytes:blob.size,cache:response.headers.get('x-sakhi-cache')||'MISS'};
      const url=await storeAudio(identity,blob);log('AUDIO_PROVIDER_USED',metrics);return{url,metrics};
    } finally {clearTimeout(timeout);if(activeRequest===controller)activeRequest=null;}
  }

  function browserFallback(text,profile) {
    if(!config().allowBrowserTtsFallback||!window.speechSynthesis||!window.SpeechSynthesisUtterance){log('NO_AUDIO_AVAILABLE',{reason:'elevenlabs_failed_and_fallback_disabled'});return Promise.resolve(false);}
    log('FALLBACK_TTS_USED',{provider:'browser',profile});
    return new Promise(resolve=>{const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=profile==='book'?.82:.87;u.pitch=1.04;u.onend=()=>resolve(true);u.onerror=()=>resolve(false);window.speechSynthesis.speak(u);});
  }

  async function playUrl(url,metrics,requestId) {
    if(requestId!==sequence)return false;
    currentAudio=new Audio(url);
    try{await currentAudio.play();lastStatus={...metrics,state:'playing',checkedAt:new Date().toISOString()};log('AUDIO_PLAYBACK_SUCCESS',metrics);return true;}
    catch(error){throw new SpeechError('ELEVENLABS_PLAYBACK_FAILURE',error.message||'The browser could not play Sakhi audio.',metrics);}
  }

  async function speak(text,{kind='instruction',profile='sakhi'}={}) {
    if(!String(text||'').trim())return false;stop();const requestId=sequence;lastRequest={text:String(text),kind,profile};
    try{const result=await requestAudio(lastRequest.text,kind,profile,requestId);return await playUrl(result.url,result.metrics,requestId);}
    catch(error){if(error?.name==='AbortError')return false;const code=error.code||'ELEVENLABS_REQUEST_FAILURE';lastStatus={provider:'elevenlabs',state:'failed',code,message:error.message,detail:error.detail||{},checkedAt:new Date().toISOString()};log(code,{provider:'elevenlabs',kind,message:error.message,...(error.detail||{})});log('AUDIO_PROVIDER_FAILED',{provider:'elevenlabs',kind,code,message:error.message});return browserFallback(lastRequest.text,profile);}
  }

  async function healthCheck({play=true}={}) {
    const text="Hello! I'm Sakhi. Ready for a magical learning adventure?";stop();const requestId=sequence;
    try{const result=await requestAudio(text,'instruction','sakhi',requestId,true);if(play)await playUrl(result.url,result.metrics,requestId);lastStatus={...result.metrics,state:play?'playing':'healthy',checkedAt:new Date().toISOString()};return{ok:true,...lastStatus};}
    catch(error){const code=error.code||'ELEVENLABS_REQUEST_FAILURE';lastStatus={provider:'elevenlabs',state:'failed',code,message:error.message,detail:error.detail||{},checkedAt:new Date().toISOString()};log(code,{message:error.message,...(error.detail||{})});return{ok:false,...lastStatus};}
  }

  function speakPhoneme(assetId) {
    const id=String(assetId||'').replace(/^phoneme_/,'').replace(/^short_/,'');const item=validatedPhonemes.get(id);
    if(!item||item.status!=='validated'){log('PHONEME_AUDIO_NOT_VALIDATED',{phonemeId:id,status:item?.status||'missing'});return Promise.resolve(false);}
    return speak(item.cue,{kind:'word',profile:'sakhi'});
  }
  function replay(){return lastRequest?speak(lastRequest.text,lastRequest):Promise.resolve(false);}

  window.SpeechService={speak,speakInstruction:(t,p='sakhi')=>speak(t,{kind:'instruction',profile:p}),speakCharacter:(t,p='sakhi')=>speak(t,{kind:'character',profile:p}),speakFeedback:(t,p='sakhi')=>speak(t,{kind:'feedback',profile:p}),speakWord:(t,p='sakhi')=>speak(t,{kind:'word',profile:p}),speakStory:(t,p='book')=>speak(t,{kind:'story',profile:p}),speakPhoneme,stop,stopSpeech:stop,replay,repeatSpeech:replay,pause:()=>currentAudio?.pause(),resume:()=>currentAudio?.play(),healthCheck,status:()=>({...lastStatus,cacheSize:memoryCache.size,phonemeAudio:'manual-validation-required'})};
})();
