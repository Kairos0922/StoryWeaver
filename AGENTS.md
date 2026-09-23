# Agents.md

## Purpose

This repository documents and validates StoryWeaver: a programmatic visual storytelling system that converts structured content into deterministic video.

## Working Principles

1. Evidence before conclusions: distinguish verified facts, hypotheses, observations, inferences, and decisions.
2. First principles: define the user problem and required capability before selecting technologies.
3. No unsupported claims.
4. Avoid duplicate abstractions: reuse mature rendering infrastructure when it is not a source of differentiation.
5. Experiment before implementation.
6. Determinism is a requirement and must be measured.
7. MVP scope is limited to knowledge/explainer video unless evidence changes the decision.
8. Keep one concept in one canonical document.
9. Use professional terminology; avoid hype, sensationalism, and vague product language.
10. Record material decisions and their evidence.

## Repository Structure

- README.md — project definition, status, scope, and navigation.
- Agents.md — contribution and documentation rules.
- docs/00-overview.md — project charter and current state.
- docs/01-problem-definition.md — problem, users, constraints, and non-goals.
- docs/02-competitive-landscape.md — competitor and ecosystem analysis.
- docs/03-product-thesis.md — hypotheses and proposed differentiation.
- docs/04-system-architecture.md — target architecture and boundaries.
- docs/05-mvp-definition.md — MVP scope and acceptance criteria.
- docs/06-experiment-plan.md — validation methodology.
- docs/07-decision-log.md — dated decisions and evidence.
- docs/08-research-log.md — research findings and sources.
- docs/09-glossary.md — canonical terminology.
- specs/ — machine-readable schemas and renderer-independent visual grammar.
- experiments/ — controlled experiment inputs, prompts, rubrics, and results.

## Documentation Rules

- Use hierarchical Markdown headings.
- Prefer tables for structured comparisons.
- Mark uncertain statements as hypotheses or open questions.
- Include source links for externally verified claims.
- Do not silently change project scope.
- Do not add implementation complexity before an experiment demonstrates the need.
- Experiment prompts and evaluation criteria must be versioned with the experiment record.
- Keep baseline and treatment variables explicit so results remain comparable.

## Change Discipline

Before adding a subsystem, answer:
1. What validated problem does it solve?
2. Why can an existing component not solve it?
3. What measurable outcome changes?
4. What is the smallest experiment that can validate it?

A component that fails this test belongs outside the MVP.
