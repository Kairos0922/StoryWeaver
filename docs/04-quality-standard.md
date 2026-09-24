# Quality Standard

## P0 — release blockers

- schema failure
- invalid MP4
- wrong dimensions/fps
- timeline gap/overlap
- missing/corrupted text
- unsupported factual claim
- render crash
- blank/garbled frame
- broken transition that exposes an unintended intermediate state

## P1 — must fix before publishing

### Semantic
- visual does not explain the narration
- visual metaphor is ambiguous or decorative
- important information is missing from the frame
- hook does not establish the subject quickly enough

### Visual
- inconsistent recurring character/object
- scene composition changes without narrative reason
- motion competes with the focal information
- typography hierarchy is unstable
- transitions hide or destroy information
- mobile-sized viewing makes key information unreadable

### Temporal
- material caption/audio drift
- beat changes do not align with intended reveal
- long dead-air intervals
- motion starts/stops without a semantic reason

## P2 — polish

- micro-spacing
- easing refinement
- minor visual balance
- decorative detail

## Automated gates

1. npm test
2. npm run validate
3. render canonical examples
4. media inspection
5. representative-frame inspection at first / 25% / 50% / 75% / final
6. defect log

A task is not complete merely because schema validation passes.
