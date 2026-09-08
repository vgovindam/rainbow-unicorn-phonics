import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROVIDER = "elevenlabs";
const PUBLIC_CLIENT_KEY = "sb_publishable_2rp84hm1GThThM-V5-s4jA_3Z_090ne";
const OUTPUT_FORMAT = "mp3_44100_128";
const INTERACTIVE_MODEL = Deno.env.get("SAKHI_INTERACTIVE_MODEL") || "eleven_flash_v2_5";
const STORY_MODEL = Deno.env.get("SAKHI_STORY_MODEL") || "eleven_multilingual_v2";
const ALLOWED_ORIGINS = new Set([
  "https://vgovindam.github.io",
  "https://sakhilearning.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const ALLOWED_KINDS = new Set(["instruction", "character", "word", "story", "feedback"]);
const ALLOWED_PROFILES = new Set(["sakhi", "ice", "ocean", "book", "luna"]);
const audioCache = new Map<string, { bytes: ArrayBuffer; voiceName: string; model: string; created: number }>();
const rate = new Map<string, { count: number; reset: number }>();
let voiceHealth: { name: string; checked: number } | null = null;

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "Content-Type, X-Sakhi-Provider, X-Sakhi-Voice-Id, X-Sakhi-Voice-Name, X-Sakhi-Model, X-Sakhi-Output-Format, X-Sakhi-Cache, X-Sakhi-Latency-Ms, X-Sakhi-Audio-Bytes",
    "Vary": "Origin",
  };
}

function jsonError(origin: string | null, status: number, code: string, message: string, upstreamStatus?: number) {
  console.error(code, { status, upstreamStatus, message });
  return Response.json({ error: { code, message, upstream_status: upstreamStatus || null } }, { status, headers: cors(origin) });
}

function limited(req: Request) {
  const now = Date.now();
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim();
  const hit = rate.get(ip);
  if (!hit || now >= hit.reset) { rate.set(ip, { count: 1, reset: now + 60_000 }); return false; }
  hit.count += 1;
  return hit.count > 60;
}

function upstreamCode(status: number, detail: string) {
  const lower = detail.toLowerCase();
  if (status === 401 || status === 403) return "ELEVENLABS_AUTH_FAILURE";
  if (status === 404) return "ELEVENLABS_VOICE_NOT_FOUND";
  if (status === 429 && /quota|credit|subscription/.test(lower)) return "ELEVENLABS_QUOTA_FAILURE";
  if (status === 429) return "ELEVENLABS_RATE_LIMIT";
  if (status === 400 || status === 422) return "ELEVENLABS_REQUEST_FAILURE";
  return "ELEVENLABS_REQUEST_FAILURE";
}

function safeHeader(value: string) { return value.replace(/[^\x20-\x7E]/g, "").slice(0, 120); }

async function validateVoice(apiKey: string, voiceId: string) {
  if (voiceHealth && Date.now() - voiceHealth.checked < 300_000) return voiceHealth.name;
  const response = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
    headers: { "xi-api-key": apiKey, "Accept": "application/json" },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw { status: response.status, code: upstreamCode(response.status, detail), message: "The configured Sakhi voice could not be validated." };
  }
  const voice = await response.json();
  voiceHealth = { name: String(voice?.name || "Sakhi voice"), checked: Date.now() };
  return voiceHealth.name;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response("Forbidden", { status: 403, headers: cors(origin) });
    return new Response("ok", { headers: cors(origin) });
  }
  if (req.method !== "POST") return jsonError(origin, 405, "ELEVENLABS_REQUEST_FAILURE", "Method not allowed.");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return jsonError(origin, 403, "ELEVENLABS_REQUEST_FAILURE", "Origin not allowed.");
  if (req.headers.get("apikey") !== PUBLIC_CLIENT_KEY) return jsonError(origin, 401, "ELEVENLABS_AUTH_FAILURE", "Invalid application client key.");
  if (limited(req)) return jsonError(origin, 429, "ELEVENLABS_RATE_LIMIT", "Too many narration requests. Please wait a moment.");

  const started = Date.now();
  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = Deno.env.get("SAKHI_VOICE_ID");
    if (!apiKey || !voiceId) return jsonError(origin, 500, "ELEVENLABS_CONFIGURATION_FAILURE", "Sakhi voice secrets are not configured.");

    const body = await req.json();
    const text = String(body?.text || "").trim();
    const kind = ALLOWED_KINDS.has(body?.kind) ? body.kind : "instruction";
    const profile = ALLOWED_PROFILES.has(body?.profile) ? body.profile : "sakhi";
    if (!text || text.length > 1200) return jsonError(origin, 400, "ELEVENLABS_REQUEST_FAILURE", "Narration text is missing or too long.");

    const model = kind === "story" ? STORY_MODEL : INTERACTIVE_MODEL;
    const voiceName = await validateVoice(apiKey, voiceId);
    const settings: Record<string, { stability: number; style: number; similarity_boost: number; speed: number }> = {
      sakhi: { stability: 0.52, style: 0.28, similarity_boost: 0.76, speed: 0.94 },
      ice: { stability: 0.60, style: 0.18, similarity_boost: 0.74, speed: 0.92 },
      ocean: { stability: 0.48, style: 0.32, similarity_boost: 0.76, speed: 0.96 },
      book: { stability: 0.62, style: 0.14, similarity_boost: 0.74, speed: 0.90 },
      luna: { stability: 0.45, style: 0.36, similarity_boost: 0.76, speed: 0.96 },
    };
    const s = settings[profile];
    const key = [PROVIDER, model, voiceId, OUTPUT_FORMAT, JSON.stringify(s), text].join("|");
    const cached = audioCache.get(key);
    let bytes: ArrayBuffer;
    let cache = "MISS";
    if (cached) {
      bytes = cached.bytes.slice(0);
      cache = "HIT";
    } else {
      const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({ text, model_id: model, voice_settings: { ...s, use_speaker_boost: true } }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return jsonError(origin, upstream.status === 429 ? 429 : 502, upstreamCode(upstream.status, detail), "ElevenLabs could not generate Sakhi narration.", upstream.status);
      }
      const type = upstream.headers.get("content-type") || "";
      if (!type.startsWith("audio/")) return jsonError(origin, 502, "ELEVENLABS_REQUEST_FAILURE", "ElevenLabs returned an unsupported audio format.");
      bytes = await upstream.arrayBuffer();
      if (!bytes.byteLength) return jsonError(origin, 502, "ELEVENLABS_REQUEST_FAILURE", "ElevenLabs returned empty audio.");
      if (audioCache.size >= 80) {
        const oldest = audioCache.keys().next().value;
        if (oldest) audioCache.delete(oldest);
      }
      audioCache.set(key, { bytes: bytes.slice(0), voiceName, model, created: Date.now() });
    }

    return new Response(bytes, { status: 200, headers: {
      ...cors(origin), "Content-Type": "audio/mpeg", "Cache-Control": kind === "story" ? "private, max-age=300" : "private, max-age=86400",
      "X-Sakhi-Provider": PROVIDER, "X-Sakhi-Voice-Id": voiceId, "X-Sakhi-Voice-Name": safeHeader(voiceName),
      "X-Sakhi-Model": model, "X-Sakhi-Output-Format": OUTPUT_FORMAT, "X-Sakhi-Cache": cache,
      "X-Sakhi-Latency-Ms": String(Date.now() - started), "X-Sakhi-Audio-Bytes": String(bytes.byteLength),
    }});
  } catch (error) {
    const e = error as { status?: number; code?: string; message?: string };
    return jsonError(origin, e.status && e.status >= 400 ? (e.status === 429 ? 429 : 502) : 500, e.code || "ELEVENLABS_CONFIGURATION_FAILURE", e.message || "Unexpected Sakhi voice failure.", e.status);
  }
});
