# StoryWeaver

**Programmatic visual storytelling from structured content.**

StoryWeaver explores a content-to-video production model in which semantic structure and visual expression are explicitly represented before deterministic rendering.

## Core Idea

StoryWeaver is not intended to compete with generative video models on unrestricted visual realism.

Its working hypothesis is that many knowledge-oriented videos benefit more from:
- deterministic visual structure;
- reproducible timing and composition;
- low rendering cost;
- precise audio and caption synchronization;
- reusable visual patterns;
- parameterized and batch generation;
- targeted human control.

The proposed pipeline is:

    Content
      ↓
    Semantic Model
      ↓
    Visual Grammar
      ↓
    Scene Program
      ↓
    Deterministic Renderer
      ↓
    Video

AI may assist with research, semantic analysis, asset generation, and scene planning. Rendering is treated as a separate, controllable layer.

## Initial Scope

The first validation target is **knowledge/explainer video**.

Potential future domains include educational content, children's language learning, data and information visualization, structured storytelling, and product/process explanation.

These are future hypotheses, not current MVP commitments.

## Non-Goals

The project does not initially aim to:
- build a general-purpose AI video model;
- reproduce cinematic or photorealistic generation;
- replace mature rendering engines;
- support every video genre;
- build a full online video editor;
- establish a production platform before the core hypothesis is validated.

## Validation Question

> Can a semantic-to-visual layer produce materially better knowledge-explainer videos than a general coding agent + existing programmatic renderer, while reducing manual correction and preserving reproducibility?

The project should continue only if experiments provide evidence for a durable advantage.

## Current Status

**Phase:** Experiment 001 — controlled baseline/treatment validation.

Experiment 001 fixes the source narration, output constraints, renderer, and evaluation protocol before implementation. See:
- `experiments/001-source.md`
- `experiments/001-baseline-prompt.md`
- `experiments/001-storyweaver-prompt.md`
- `experiments/001-evaluation-rubric.md`
- `experiments/001-record.md`

See `docs/00-overview.md` for the project state.
