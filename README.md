# StoryWeaver

**Content → Story → Visual Program → Deterministic Video**

StoryWeaver is a model-agnostic production system for publishable short-form programmatic video. It is not a technical demo generator and is not tied to Claude Opus 5.5 or any other model provider.

## Core production loop

Reference → Style Guide → Story → Beat Sheet → Shot List → Animation Program / VideoSpec → Deterministic Render → Review → Critique → Structured Revision → Render

A strong model can perform creative planning and revision. Lower-cost models can perform constrained edits. StoryWeaver owns the stable contracts, validation, deterministic rendering and review artifacts.

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
3. Every shot must contain a meaningful state change.
4. Motion must clarify, emphasize, compare, transform, reveal or create a deliberate narrative beat.
5. Reuse stable visual identities instead of redrawing recurring subjects.
6. The executable plan is a production contract, not a place for the renderer to invent intent.
7. Identical specs/assets render deterministically.
8. Validation, media inspection and structured critique are release gates.
9. Provider-specific assumptions must not leak into the core architecture.

## Repository

- src/ — compiler, validator, deterministic renderer and CLI
- specs/ — machine-readable contracts and visual grammar
- research/ — sourced case research and scenario evidence
- docs/ — architecture, agent contract and production decisions
- tasks/ — production tasks for external models
- experiments/ — reproducible production experiments
- examples/ — canonical renderable examples
- tests/ — automated contract tests

## Quick start

    npm install
    npm test
    npm run validate
    npm run method-proof
    npm run render

Rendering uses programmatic JavaScript/SVG. resvg performs SVG rasterization and FFmpeg performs final MP4 encoding; no video-generation model is required.

## Method Proof

The canonical small-scale proof lives in experiments/method-proof.

It demonstrates:

Reference → planning → executable spec → render → inspect → critique → structured repair → rerender

The CI pipeline runs this proof as a release gate and stores both revision renders and the review manifest as artifacts.

## Model portability

Claude, GPT, Gemini and other coding agents are interchangeable production inputs. Opus 5.5 is treated as a source of case-derived methodology, not as a product dependency.

See docs/agent-contract.md, docs/architecture.md, docs/10-opus55-case-derived-design.md and tasks/production-task-list.md.
