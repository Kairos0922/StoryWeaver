# Production Task List

> These tasks exercise the legacy SVG compiler. A series episode does not start from a VideoSpec. Use `.cursor/skills/produce-next-episode/SKILL.md`.

These are real publishing tasks, not demos. They are designed to exercise the reusable capabilities discovered in the case research.

## Protocol

1. Give the model the task plus docs/agent-contract.md.
2. Require a validated VideoSpec.
3. Render with the repository CLI.
4. Inspect first, 25%, 50%, 75% and final frames.
5. Inspect the hook and every beat transition.
6. Record P0/P1/P2 defects.
7. Repair only affected structured elements.
8. Record model, cost/tokens if available, wall time, render time, repair turns and final status.

## T01 — Visual narrative

Create a 25–40 second short story with one recurring character, one recurring object and three locations.

Acceptance:
- first beat establishes a clear hook;
- characterId is reused across scenes;
- at least one state transformation carries the story;
- ending provides a payoff;
- no unrelated decorative motion.

## T02 — Lyric / music visual

Create a 20–30 second vertical lyric visual from fixed lyrics. Each lyric line gets a distinct visual beat.

Acceptance:
- exact text;
- visual changes at lyric boundaries;
- typography remains readable on a phone;
- motion never competes with lyrics.

## T03 — SaaS product promo

Given a product description and three UI screenshots, create a 20–30 second vertical promo: problem → feature → outcome → CTA.

Acceptance:
- exact UI labels;
- every animation demonstrates behavior;
- CTA readable;
- visual hierarchy remains stable.

## T04 — Feature update

Modify T03 only for feature name, metric, palette and CTA.

Acceptance:
- unrelated scenes do not change;
- diff is localized;
- render remains valid.

## T05 — Knowledge explainer

Explain one causal scientific concept in 30–45 seconds from fixed source text.

Acceptance:
- causal relations are visible;
- no unsupported claims;
- one dominant purpose per scene;
- at least one meaningful transformation.

## T06 — Process explanation

Explain a 4–6 step technical workflow using a persistent spatial layout.

Acceptance:
- ordering unambiguous;
- state transitions visible;
- captions synchronized;
- same visual anchors persist between steps.

## T07 — Concept comparison

Explain two approaches using synchronized side-by-side visuals.

Acceptance:
- same scale;
- differences trace to source;
- no misleading animation;
- comparison remains legible on mobile.

## T08 — Data story

Turn a fixed 5–10 row dataset into a 20–30 second animated chart narrative.

Acceptance:
- every value matches source;
- units explicit;
- animation does not distort comparison;
- the final beat states the supported takeaway.

## T09 — Trend update

Modify only T08's dataset and conclusion.

Acceptance:
- chart geometry remains valid;
- all changed values propagate;
- no stale labels;
- visual structure remains unchanged.

## T10 — History / story

Create a 30–45 second timeline with locations, actors and state changes from fixed source material.

Acceptance:
- chronology correct;
- spatial relationships stable;
- no invented facts;
- transitions reveal rather than obscure changes.

## Model portability

Run T01, T03, T05 and T08 with frontier, mid-cost and low-cost models. Equal artistic quality is not required. All models must be able to produce a valid, semantically faithful VideoSpec. Record quality, repair cost, token cost and wall time separately.
