// Public client configuration only. The Supabase publishable/anon key is designed for browser use with RLS enabled.
// Never place a service-role or secret key here.
window.RAINBOW_CONFIG=window.RAINBOW_CONFIG||{
  supabaseUrl:'https://okzmrlrijovbuatjcgqi.supabase.co',
  supabaseAnonKey:'sb_publishable_2rp84hm1GThThM-V5-s4jA_3Z_090ne',
  ttsEndpoint:'https://okzmrlrijovbuatjcgqi.supabase.co/functions/v1/sakhi-tts',
  ttsProvider:'elevenlabs',
  ttsInteractiveModel:'eleven_flash_v2_5',
  ttsStoryModel:'eleven_multilingual_v2',
  ttsOutputFormat:'mp3_44100_128',
  ttsConfigVersion:'4',
  allowBrowserTtsFallback:false,
  parentSessionMinutes:15
};
