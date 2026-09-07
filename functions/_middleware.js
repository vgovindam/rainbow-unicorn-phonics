const COOKIE_NAME = 'rainbow_family_session';
const SESSION_DAYS = 30;

function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function safeEqual(a = '', b = '') {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(sig));
}

async function makeSession(username, secret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = `${username}|${exp}`;
  const signature = await sign(payload, secret);
  return `${encodeURIComponent(payload)}.${signature}`;
}

async function validSession(cookieValue, username, secret) {
  if (!cookieValue || !secret) return false;
  const dot = cookieValue.lastIndexOf('.');
  if (dot < 1) return false;
  let payload;
  try {
    payload = decodeURIComponent(cookieValue.slice(0, dot));
  } catch {
    return false;
  }
  const provided = cookieValue.slice(dot + 1);
  const expected = await sign(payload, secret);
  if (!safeEqual(provided, expected)) return false;
  const [user, expText] = payload.split('|');
  const exp = Number(expText);
  return user === username && Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return '';
}

function loginPage(error = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#9257de">
<title>Family Access · Rainbow Magic Learning</title>
<style>
:root{--ink:#35254f;--muted:#756986;--purple:#9257de;--pink:#ff70aa;--gold:#ffd76a}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:22px;font-family:ui-rounded,"SF Pro Rounded","Avenir Next",system-ui,-apple-system,sans-serif;color:var(--ink);background:radial-gradient(circle at 15% 10%,rgba(255,112,170,.28),transparent 28%),radial-gradient(circle at 88% 10%,rgba(123,202,255,.30),transparent 28%),linear-gradient(150deg,#fff9fd,#f5f0ff,#effcff)}
.card{width:min(440px,100%);padding:28px;border-radius:30px;background:rgba(255,255,255,.94);box-shadow:0 22px 65px rgba(70,38,103,.17);border:1px solid rgba(255,255,255,.95);position:relative;overflow:hidden}.sparkles{font-size:30px;letter-spacing:8px;text-align:center;filter:drop-shadow(0 3px 7px rgba(220,165,15,.25))}.icon{font-size:72px;text-align:center;margin:8px 0}.badge{display:block;width:max-content;margin:0 auto 10px;padding:7px 11px;border-radius:999px;background:#f1e9ff;color:#70459e;font-size:12px;font-weight:900}h1{text-align:center;font-size:30px;line-height:1.05;margin:8px 0 8px}p{text-align:center;color:var(--muted);line-height:1.45;margin:0 0 20px}.field{margin:12px 0}.field label{display:block;font-size:12px;font-weight:900;margin:0 0 6px}.field input{width:100%;min-height:52px;border-radius:16px;border:2px solid #e8dff3;padding:12px 14px;font-size:18px;outline:none;background:#fff}.field input:focus{border-color:#b797e7;box-shadow:0 0 0 4px rgba(146,87,222,.10)}button{width:100%;min-height:54px;margin-top:8px;border:0;border-radius:17px;color:white;background:linear-gradient(135deg,var(--purple),var(--pink));font-size:17px;font-weight:950;box-shadow:0 10px 25px rgba(124,72,173,.20)}.error{padding:10px 12px;border-radius:13px;background:#fff0f5;color:#a93862;font-size:13px;font-weight:800;text-align:center;margin-bottom:12px}.note{margin-top:15px;font-size:11px;color:#8b8097;text-align:center;line-height:1.4}.star{color:#dfa81d;text-shadow:0 0 8px #fff1a8}
</style>
</head>
<body>
<main class="card">
  <div class="sparkles"><span class="star">✦</span> ⭐ <span class="star">✦</span></div>
  <div class="icon">🦄👑</div>
  <span class="badge">🔒 Private Family Learning</span>
  <h1>Enter the Magic Kingdom</h1>
  <p>Ask your grown-up for the family username and passcode.</p>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/__family-login">
    <div class="field"><label for="username">Family username</label><input id="username" name="username" autocomplete="username" autocapitalize="none" required></div>
    <div class="field"><label for="password">Family passcode</label><input id="password" type="password" name="password" autocomplete="current-password" required></div>
    <button type="submit">✨ Open Learning Adventure</button>
  </form>
  <div class="note">This device can stay signed in for about 30 days. No GitHub account is needed for family members.</div>
</main>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const familyUser = env.FAMILY_USER || '';
  const familyPass = env.FAMILY_PASS || '';
  const sessionSecret = env.SESSION_SECRET || '';

  // Fail closed if the host has not been configured yet.
  if (!familyUser || !familyPass || !sessionSecret) {
    return html('<h1>Family access is not configured yet.</h1><p>Set FAMILY_USER, FAMILY_PASS, and SESSION_SECRET in the hosting environment.</p>', 503);
  }

  if (url.pathname === '/__family-login' && request.method === 'POST') {
    const form = await request.formData();
    const username = String(form.get('username') || '').trim();
    const password = String(form.get('password') || '');

    if (safeEqual(username, familyUser) && safeEqual(password, familyPass)) {
      const token = await makeSession(familyUser, sessionSecret);
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'set-cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
          'cache-control': 'no-store',
        },
      });
    }
    return html(loginPage('That username or passcode did not match. Try again.'), 401);
  }

  if (url.pathname === '/__family-logout') {
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        'cache-control': 'no-store',
      },
    });
  }

  const cookie = readCookie(request, COOKIE_NAME);
  if (await validSession(cookie, familyUser, sessionSecret)) {
    return next();
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    return html(loginPage());
  }

  return new Response('Unauthorized', { status: 401 });
}
