# MVP Definition

## Objective

Test whether an explicit semantic-to-visual layer improves automated knowledge-explainer production.

## Scope

### Input

One structured knowledge article of approximately 800–1500 Chinese characters or an equivalent English article.

### Output

A short explanatory video containing:
- narration;
- synchronized captions;
- structured visual scenes;
- deterministic timing;
- consistent visual system.

### Domain

Knowledge/explainer content only.

### Renderer

Use an existing programmatic renderer. Do not build a renderer.

## MVP Pipeline

    Article
      ↓
    Semantic Model
      ↓
    Visual Grammar
      ↓
    Scene Program
      ↓
    Remotion
      ↓
    Narration + Captions
      ↓
    MP4

## Baseline

A strong general coding agent receives the same source material and produces a video using the same renderer and comparable assets.

## Acceptance Criteria

Evaluate:
1. content fidelity;
2. explanatory clarity;
3. visual relevance;
4. manual correction time;
5. end-to-end production time;
6. rendering cost;
7. reproducibility;
8. batch consistency.

No single subjective impression is sufficient for a product decision.

## Out of Scope

- multi-domain support;
- hosted SaaS;
- custom renderer;
- marketplace;
- collaborative editor;
- cinematic generation;
- generalized agent platform.
