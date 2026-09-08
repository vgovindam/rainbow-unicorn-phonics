# Sakhi Magic Learning

Sakhi Magic Learning is a touch-first, adaptive learning PWA for a five-year-old learner. It combines literacy and mathematics with language, logic, science, memory, executive function, social-emotional learning, life skills, creativity, and movement.

## Run locally

Serve the repository root with any static HTTP server. For example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Validation

```sh
node scripts/validate-activities.cjs
node --test tests/remediation.test.cjs
```

The tests validate activity contracts and educational answer invariants, neural-vs-browser speech selection, parent-passcode hashing and expiry, curriculum prerequisites, asset references, and production JavaScript syntax.

## Hosting and data

- Front end: static PWA on GitHub Pages.
- Durable learner data: Supabase when a parent authenticates; browser storage is an offline cache and migration source.
- Narration: the protected Supabase `sakhi-tts` Edge Function, configured for ElevenLabs. Browser TTS is disabled unless explicitly enabled in configuration.
- Art: the application-owned Sakhi scene atlas with centralized metadata and graceful visual fallback.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for source-of-truth boundaries and failure behavior.
