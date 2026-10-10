# Decision Log

## 2026-09-24 — Production compiler direction

Decision: replace the experiment-first repository with a production-oriented content-to-visual compiler.

Evidence: public Opus 5.5 examples demonstrate that programmatic media is now capable of polished narrative animation, music visuals and structured diagrams; Japanese practitioners emphasize editability and reuse.

Constraint: quality must remain stable across model tiers while reducing per-video cost.

## 2026-09-24 — Scenario scope

Decision: V1 covers music/lyrics, product explanation, knowledge explanation, data visualization and history/story.

Evidence: these families are documented in `research/01-opus55-case-research.md`.

## 2026-10-10 — Series episodes use studio gates

Decision: a series episode is produced through fact card, Phase A, script lint, human gates and QC. Rendering is an adapter over a shared kit. The SVG compiler in `src/` stays for existing experiments and is not extended for 《看不见的规则》.

Evidence: EP01 retrospective, `docs/studio/ep01-retrospective.md`. The published elevator episode was rendered before a storyboard gate, then rebuilt. No watch-time or completion numbers are in that retrospective, so none are recorded as results.

Constraint: `phase_a.md` must be human-approved before full TTS or a full render. Blank publish metrics stay blank. Paid voice APIs are not wired into this repo.
