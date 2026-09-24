# StoryWeaver

**Content → Visual Program → Deterministic Video**

StoryWeaver is a production-oriented compiler for programmatic visual storytelling. It is designed for publishing real short-form media, not for generating technical demos.

## Core pipeline

```
Content → Semantic Model → Visual Strategy → VideoSpec → Deterministic JS Renderer → MP4
```

A strong model can create or revise the semantic and visual plan. Lower-cost models can perform constrained edits. The renderer does not depend on an LLM.

## Principles

1. Content value precedes implementation convenience.
2. Motion must clarify, emphasize, compare, transform, reveal, or create a deliberate narrative beat.
3. Models emit a stable schema, not renderer-specific prose.
4. Identical specs/assets must render deterministically.
5. Expensive reasoning is reserved for planning and difficult repair.
6. Validation and media inspection are release gates.

## Repository

- `src/` — compiler, validator, deterministic renderer and CLI
- `specs/` — machine-readable contracts and visual grammar
- `research/` — sourced case research and scenario evidence
- `docs/` — architecture, quality standards and model contract
- `tasks/` — production tasks for external models
- `examples/` — canonical renderable examples
- `tests/` — automated contract tests

## Quick start

```bash
npm install
npm test
npm run validate
npm run render
```

Rendering is programmatic JavaScript/SVG. Sharp performs rasterization and FFmpeg performs final MP4 encoding; no video-generation model is required.

## Model allocation

- **Frontier model:** semantic analysis, visual strategy, difficult scene design, quality review.
- **Mid/low-cost model:** constrained edits, parameter changes, caption changes, scene substitutions.
- **No model:** validation, rendering, media inspection and deterministic transforms.

See `docs/agent-contract.md` and `tasks/production-task-list.md`.
