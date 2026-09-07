# Private Family Access Setup

## Recommended hosting: Cloudflare Pages

This repository is private. The app includes a server-side Cloudflare Pages Function at `functions/_middleware.js` that protects the entire site behind a shared family username and passcode.

Family members do **not** need GitHub accounts. They open the normal app URL, enter the family credentials once on that device, and the device stays signed in for about 30 days.

## Why not rely on GitHub Pages?

GitHub Pages websites are publicly reachable even when their source repository is private, when the account plan permits Pages for private repositories. A JavaScript-only password screen would also be bypassable because the protection code runs in the visitor's browser.

The Cloudflare Pages Function runs at the server/edge before the app or image files are served.

## One-time Cloudflare setup

1. Create or sign in to a Cloudflare account.
2. Open **Workers & Pages**.
3. Choose **Create application → Pages → Connect to Git**.
4. Connect GitHub and select only the private repository:
   - `vgovindam/rainbow-unicorn-phonics`
5. For build settings use a static site:
   - Framework preset: **None**
   - Build command: leave blank
   - Build output directory: `/` (repository root)
6. Deploy once.

Cloudflare automatically detects the root `/functions` directory and deploys the family access middleware with the site.

## Required secret environment variables

In the Cloudflare Pages project open:

**Settings → Variables and Secrets**

Add these three values to **Production** (and Preview too if you want preview deployments protected):

- `FAMILY_USER`
  - Example: `rainbowfamily`
- `FAMILY_PASS`
  - Choose a private family passcode/password. Do not commit it to GitHub.
- `SESSION_SECRET`
  - Use a long random value (recommended 32+ random characters).

After adding/changing variables, redeploy the project.

## Family experience

1. Family member opens the Cloudflare Pages URL on iPhone, iPad, Android, Mac, or PC.
2. They see the **Private Family Learning** screen.
3. Enter `FAMILY_USER` and `FAMILY_PASS`.
4. The app opens.
5. A secure HttpOnly cookie remembers that device for approximately 30 days.

No GitHub login is required.

## Logging a device out

Open:

`https://YOUR-SITE.pages.dev/__family-logout`

The family session cookie will be cleared and the login screen will appear again.

## Security behavior

- The site fails closed if the three required secrets are missing.
- Password validation occurs in the Cloudflare Function, not client JavaScript.
- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- Sessions expire after approximately 30 days.
- Static app files and family images are served only after the middleware validates the session.

## Optional later improvement

You can add a custom domain such as `learn.yourfamilydomain.com` in Cloudflare Pages without changing the family login system.
