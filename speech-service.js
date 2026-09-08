(function () {
  'use strict';
  const memoryCache = new Map();
  const phonemeIds = new Set(['m','s','t','p','n','k','a','e','i','o','u','sh','ch','th']);
  let currentAudio = null;
  let activeRequest = null;
  let lastRequest = null;
  let sequence = 0;
  const config = () => window.RAINBOW_CONFIG || {};
  const log = (type, detail) => window.SakhiEvents?.emit(type, detail);

  function authToken() {
    try {
      const ref = (config().supabaseUrl || '').match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
      const raw = ref && localStorage.getItem(`sb-${ref}-auth-token`);
      const parsed = raw && JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || '';
    } catch (_) { return ''; }
  }

  function cacheKey(text, kind, profile) {
    const c = config();
    return [c.ttsProvider || 'neural', profile, kind, text].join('|');
  }

  function stop() {
    sequence += 1;
    activeRequest?.abort();
    activeRequest = null;
    if (currentAudio) {
      try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (_) {}
      currentAudio = null;
    }
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }

  async function neuralUrl(text, kind, profile, requestId) {
    const c = config();
    if (!c.ttsEndpoint) throw new Error('Neural speech endpoint is not configured.');
    const token = authToken();
    if (!token) throw new Error('Parent sign-in is required for Sakhi voice.');
    const key = cacheKey(text, kind, profile);
    if (memoryCache.has(key)) {
      log('AUDIO_CACHE_HIT', { provider: c.ttsProvider, kind, profile });
      return memoryCache.get(key);
    }
    log('AUDIO_CACHE_MISS', { provider: c.ttsProvider, kind, profile });
    const controller = new AbortController();
    activeRequest = controller;
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(c.ttsEndpoint, {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type':'application/json', authorization:`Bearer ${token}`, apikey:c.supabaseAnonKey || '' },
        body: JSON.stringify({ text, kind, profile })
      });
      if (requestId !== sequence) throw new DOMException('Superseded', 'AbortError');
      if (!response.ok) throw new Error(`Neural speech returned HTTP ${response.status}.`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('audio/')) throw new Error(`Unexpected speech response: ${contentType || 'unknown'}.`);
      const blob = await response.blob();
      if (!blob.size) throw new Error('Neural speech returned empty audio.');
      const url = URL.createObjectURL(blob);
      memoryCache.set(key, url);
      log('AUDIO_PROVIDER_USED', { provider:c.ttsProvider || 'neural', kind, profile, bytes:blob.size });
      return url;
    } finally {
      clearTimeout(timer);
      if (activeRequest === controller) activeRequest = null;
    }
  }

  function browserFallback(text, profile) {
    if (!config().allowBrowserTtsFallback || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      log('NO_AUDIO_AVAILABLE', { reason:'neural_failed_and_fallback_disabled' });
      return Promise.resolve(false);
    }
    log('FALLBACK_TTS_USED', { provider:'browser', profile });
    return new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang='en-US'; utterance.rate=profile === 'book' ? .82 : .87; utterance.pitch=1.04;
      utterance.onend=()=>resolve(true); utterance.onerror=()=>resolve(false);
      window.speechSynthesis.speak(utterance);
    });
  }

  async function speak(text, { kind='instruction', profile='sakhi' } = {}) {
    if (!String(text || '').trim()) return false;
    stop();
    const requestId = sequence;
    lastRequest = { text:String(text), kind, profile };
    try {
      const url = await neuralUrl(lastRequest.text, kind, profile, requestId);
      if (requestId !== sequence) return false;
      currentAudio = new Audio(url);
      await currentAudio.play();
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
      log('AUDIO_PROVIDER_FAILED', { provider:config().ttsProvider || 'neural', kind, message:error.message });
      return browserFallback(lastRequest.text, profile);
    }
  }

  function speakPhoneme(assetId) {
    const id = String(assetId || '').replace(/^phoneme_/, '').replace(/^short_/, '');
    if (!phonemeIds.has(id)) {
      log('AUDIO_PROVIDER_FAILED', { provider:'validated_phoneme_layer', kind:'phoneme', message:`Unknown phoneme ${id}` });
      return Promise.resolve(false);
    }
    return speak(id, { kind:'phoneme', profile:'sakhi' });
  }
  function replay() { return lastRequest ? speak(lastRequest.text, lastRequest) : Promise.resolve(false); }

  window.SpeechService = {
    speak,
    speakInstruction:(text,profile='sakhi')=>speak(text,{kind:'instruction',profile}),
    speakCharacter:(text,profile='sakhi')=>speak(text,{kind:'character',profile}),
    speakFeedback:(text,profile='sakhi')=>speak(text,{kind:'feedback',profile}),
    speakWord:(text,profile='sakhi')=>speak(text,{kind:'word',profile}),
    speakStory:(text,profile='book')=>speak(text,{kind:'story',profile}),
    speakPhoneme, stop, stopSpeech:stop, replay, repeatSpeech:replay,
    pause:()=>currentAudio?.pause(), resume:()=>currentAudio?.play(),
    status:()=>({provider:config().ttsProvider || 'neural',cacheSize:memoryCache.size,playing:!!currentAudio})
  };
})();
