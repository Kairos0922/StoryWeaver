# Quality Standard

## P0 release blockers

- schema failure
- invalid MP4
- wrong dimensions/fps
- timeline gap/overlap
- missing or corrupted text
- unsupported factual claim
- render crash
- blank/garbled frame caused by renderer

## P1 fix before publishing

- visual does not explain narration
- important information unreadable on phone-sized viewport
- distracting motion unrelated to meaning
- inconsistent visual grammar
- material audio/caption drift
- transition obscures information

## Automated gate

`npm test` validates contracts. `npm run validate` validates the canonical example. CI runs both. Production tasks additionally require representative-frame inspection and a defect log.
