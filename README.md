# StoryWeaver

**Content → Story → Visual Program → Deterministic Video**

StoryWeaver is a production-oriented compiler for publishable short-form programmatic video. It is not a technical demo generator.

## Core pipeline

Content → Semantic Model → Story / Beat Plan → Visual Strategy → VideoSpec → Deterministic JS Renderer → MP4

A strong model can create or revise the semantic and visual plan. Lower-cost models can perform constrained edits. The renderer does not depend on an LLM.

## What the system is optimized for

- visual narratives with recurring characters/objects
- lyric and music visuals
- knowledge explainers
- product/SaaS promos
- data stories
- process and comparison videos
- history/timeline stories

These formats share the properties that make programmatic rendering valuable: exact text, deterministic geometry, semantic motion, synchronized timing and localized revision.

## Production principles

1. Content value precedes implementation convenience.
2. Hook → progression → payoff is part of the production contract.
3. Motion must clarify, emphasize, compare, transform, reveal or create a deliberate narrative beat.
4. Reuse visual identities instead of redrawing recurring subjects.
5. Models emit a stable VideoSpec, not renderer-specific prose.
6. Identical specs/assets render deterministically.
7. Expensive reasoning is reserved for story/visual strategy and difficult repair.
8. Validation and media inspection are release gates.

## Repository

- src/ — compiler, validator, deterministic renderer and CLI
- specs/ — machine-readable contracts and visual grammar
- research/ — sourced case research and scenario evidence
- docs/ — architecture, quality standards, model contract and case-derived decisions
- tasks/ — production tasks for external models
- examples/ — canonical renderable examples
- tests/ — automated contract tests

## Quick start

    npm install
    npm test
    npm run validate
    npm run render

Rendering uses programmatic JavaScript/SVG. Sharp performs rasterization and FFmpeg performs final MP4 encoding; no video-generation model is required.

## Model allocation

- Frontier model: semantic analysis, story/visual strategy, difficult scene design, quality review.
- Mid/low-cost model: constrained edits, parameter changes, caption changes, scene substitutions.
- No model: validation, rendering, media inspection and deterministic transforms.

See docs/agent-contract.md, docs/10-opus55-case-derived-design.md and tasks/production-task-list.md.
