# Production Task List

These are real production tasks for external models, not demo prompts.

## Protocol

1. Give the model the task plus `docs/agent-contract.md`.
2. Require a validated `VideoSpec`.
3. Render with the repository CLI.
4. Inspect first, 25%, 50%, 75% and final frames.
5. Record P0/P1/P2 defects.
6. Repair only affected structured elements.
7. Record model, cost/tokens if available, wall time, repair turns and final status.

## T01 — Lyric motion

Create a 20–30 second vertical lyric visual from fixed lyrics. Each lyric line gets a distinct visual beat. No video-generation model.

Acceptance: exact text; visual changes at lyric boundaries; motion never competes with lyrics.

## T02 — Narrative music

Create a 30–45 second landscape music narrative with one recurring character and three locations.

Acceptance: character geometry remains structurally identical; transitions preserve story continuity.

## T03 — SaaS product promo

Given a product description and three UI screenshots, create a 20–30 second vertical promo: problem → feature → outcome → CTA.

Acceptance: exact UI labels; every animation demonstrates behavior; CTA readable.

## T04 — Feature update

Modify T03 only for feature name, metric, palette and CTA.

Acceptance: unrelated scenes do not change; diff is localized; render remains valid.

## T05 — Knowledge explainer

Explain one causal scientific concept in 30–45 seconds from fixed source text.

Acceptance: causal relations are visible; no unsupported claims; one dominant purpose per scene.

## T06 — Process explanation

Explain a 4–6 step technical workflow using a persistent spatial layout.

Acceptance: ordering unambiguous; state transitions visible; captions synchronized.

## T07 — Concept comparison

Explain two approaches using synchronized side-by-side visuals.

Acceptance: same scale; differences trace to source; no misleading comparison.

## T08 — Data story

Turn a fixed 5–10 row dataset into a 20–30 second animated chart narrative.

Acceptance: every value matches source; units explicit; animation does not distort comparison.

## T09 — Trend update

Modify only T08's dataset and conclusion.

Acceptance: chart geometry remains valid; all changed values propagate; no stale labels.

## T10 — History / story

Create a 30–45 second timeline with locations, actors and state changes from fixed source material.

Acceptance: chronology correct; spatial relationships stable; no invented facts.

## Model portability

Run T03, T05 and T08 with frontier, mid-cost and low-cost models. Equal artistic quality is not required. All three must be able to produce a valid, semantically faithful VideoSpec; quality and repair cost are recorded separately.
