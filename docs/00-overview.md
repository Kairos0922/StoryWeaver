# Project Overview

## Status

**Phase:** Experiment 001 — controlled validation
**Current decision:** Execute Experiment 001 before adding product implementation.

## Problem Space

Programmatic video rendering is already well served by mature systems. The unresolved question is whether a higher-level semantic-to-visual layer can systematically improve production of structured knowledge videos.

## Proposed System Boundary

    Knowledge / Article / Structured Data
                    ↓
            Semantic Representation
                    ↓
              Visual Grammar
                    ↓
              Scene Program
                    ↓
           Existing Renderers
                    ↓
                   Video

Rendering engines are implementation dependencies, not the primary product hypothesis.

## Current Hypothesis

For knowledge-oriented videos, explicit semantic relationships such as cause/effect, process, comparison, sequence, hierarchy, state change, and quantitative change can be mapped to reusable visual patterns. This representation may improve consistency, editability, reproducibility, and production efficiency.

This is a hypothesis and requires experimental validation.

## Success Condition

The MVP must demonstrate a measurable advantage over a strong baseline: general coding agent + mature programmatic renderer.

Primary measures:
- visual explanation quality;
- factual and structural fidelity;
- manual correction effort;
- reproducibility;
- production time;
- rendering cost;
- batch scalability.

## Current Risks

1. A general-purpose agent may already generate adequate scene programs.
2. Visual grammar may provide insufficient quality improvement to justify a dedicated system.
3. The abstraction may become too broad and reproduce existing agent workflows.
4. Renderer differences may dominate perceived quality.
5. Asset generation may become the actual bottleneck.

These risks are addressed by docs/06-experiment-plan.md.
