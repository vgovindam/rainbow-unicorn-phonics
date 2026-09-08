# Sakhi architecture and remediation record

## Source-of-truth map

| Concern | Authoritative source |
| --- | --- |
| Learner state in memory | `data` in `app.js` |
| Durable progress | Supabase tables and policies in `supabase-schema.sql` via `persistence.js` |
| Offline progress cache | `rainbowMagicLearningV2` local storage snapshot; never represented as cross-device sync |
| Pending remote write | `sakhiPendingProgressV1`, retried after authentication/connection recovery |
| Curriculum graph | `curriculum.js` |
| Mastery evidence | `recordEvidence` in `app.js`; remote attempts in `persistence.js` |
| Activity contract and renderers | `interaction-engine.js` and `activity-schema.json` |
| Narration | `SpeechService` in `speech-service.js` |
| Phoneme requests | `SpeechService.speakPhoneme`, limited to validated stable IDs |
| Images | `AssetService` in `visuals.js`, backed by the Sakhi scene atlas |
| Parent access | `SakhiParent` in `sakhi-shell.js`; SHA-256 comparison and expiring tab session |
| Runtime diagnostics | `SakhiEvents` in `system-events.js` |
| Theme tokens | `styles.css`; feature layout in `interactions.css`, `visuals.css`, and `sakhi-shell.css` |

## Important runtime flows

Narration follows `child action → SpeechService → authenticated sakhi-tts Edge Function → ElevenLabs → audio response → centralized player`. New speech aborts the prior request/playback. Provider errors are logged and shown as unavailable; browser TTS cannot silently take over.

Progress follows `activity completion → local snapshot + pending marker → attempt write + skill/profile synchronization → pending marker removal`. A failed network write remains recoverable locally and is reported as awaiting retry.

Activities are accepted only when their interaction type and required structured fields validate. Production content is additionally checked in CI for selectable answers, numeric-manipulative counts, visual-answer consistency, and controlled phonics/spelling mappings.

## Remediation decisions

- Removed the obsolete kid-upgrade and scheduler layers. They replaced core functions at load time, called browser speech directly, and referenced missing image files.
- Removed runtime function wrappers for navigation, quest rendering, activity completion, persistence, visuals, and adaptive reports. Services are now called explicitly.
- Kept browser speech only as an opt-in emergency capability inside `SpeechService`; production configuration disables it.
- Kept the existing local data shape and Supabase schema to preserve learner history across this upgrade.

## Known operational dependency

Natural narration requires a valid parent Supabase session and working `ELEVENLABS_API_KEY` / `SAKHI_VOICE_ID` secrets on the deployed `sakhi-tts` function. The front end never receives those secrets.
