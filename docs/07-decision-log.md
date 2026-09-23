# Decision Log

## 2026-09-23 — Proceed to MVP Validation

**Decision:** Continue the project as a programmatic visual storytelling research project.

**Rationale:**
- programmatic rendering is technically mature;
- existing projects already cover renderer and timeline infrastructure;
- agentic video workflows are increasingly available;
- a potential differentiation remains in explicit semantic-to-visual representation;
- the hypothesis is testable with a small controlled experiment.

**Constraint:** Do not build a new rendering engine before the semantic-to-visual hypothesis is validated.

## 2026-09-23 — Initial MVP Domain

**Decision:** Restrict the MVP to knowledge/explainer videos.

**Rationale:** This domain has structured semantic relationships and does not require unrestricted cinematic generation.

## 2026-09-23 — Renderer Strategy

**Decision:** Reuse an existing programmatic renderer for the MVP.

**Rationale:** Renderer capability is already mature and is not the primary research question.

## 2026-09-23 — Product Boundary

**Decision:** Treat semantic model, visual grammar, and scene program as the candidate product boundary.

**Rationale:** These layers are upstream of rendering and are the primary remaining hypothesis after competitive analysis.
