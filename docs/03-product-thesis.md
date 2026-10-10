# Product Thesis

> Series episodes are gated in `docs/studio/`. This note describes the older visual-program thesis and still applies to the legacy SVG compiler.

## Thesis

StoryWeaver should be treated as a **programmatic visual storytelling layer**, not as a video renderer.

Its core abstraction is:

    Semantic Model
          ↓
    Visual Grammar
          ↓
    Scene Program

## Semantic Model

The model represents what the content means rather than how a video looks.

Initial semantic primitives:
- concept;
- cause;
- effect;
- process;
- state;
- state change;
- comparison;
- sequence;
- hierarchy;
- quantity;
- spatial relationship;
- temporal relationship.

## Visual Grammar

A visual grammar maps semantic primitives to reusable visual structures.

| Semantic relation | Candidate visual pattern |
|---|---|
| Cause → effect | causal chain |
| Process | staged transformation |
| Comparison | aligned split view |
| Hierarchy | spatial hierarchy |
| Sequence | timeline or ordered reveal |
| Quantity | animated quantitative encoding |
| State change | before → transition → after |
| Spatial relation | diagram or spatial composition |

## Scene Program

The scene program is an executable representation containing:
- scene structure;
- visual elements;
- timing;
- animation;
- camera;
- audio;
- captions;
- renderer-specific implementation data.

The scene program should remain renderer-independent where practical.

## Product Principle

The system should preserve semantic intent while allowing rendering technology to change.

This creates a separation between **what should be communicated** and **how a renderer realizes it**.
