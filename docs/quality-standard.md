# Release quality standard — v1.1

Status: v1.1, 2026-10-11 (v1.1 adds the fourth review question and reviewer guidance; machine gates unchanged). This is a working standard. Revise it from real, published episodes: when a shipped cut shows a number here is wrong, change the number in its single source and note the episode in `CHANGELOG.md`. A value measured on a real episode beats a value from outside material until a real cut proves otherwise.

The standard applies to every topic, language, and audience. Audience-specific rules live in optional profiles (see below), never in the general gates.

Run it:

```
node studio/cli.mjs quality <episode-dir> [--json]
```

Exit 0: every machine gate passes and a person answered all four review questions "yes". Exit 3: machine gates pass, human review pending. Exit 1: a machine gate failed.

## Tier 1 — Machine gates (blocking)

Every gate reuses an existing check. `quality` only aggregates; fix a gate in its source check, not here.

| Gate | Rule | Enforced by | Single source of the number |
|---|---|---|---|
| `pace` | Narration at a comfortable pace (zh ~3.7 chars/s; hard caps 4.0 avg / 4.6 per line; en 2.8 / 3.2 words/s); key-number lines hold ≥ 0.9 s after | `qc` item `pace_ok` (`studio/pace.mjs`) | `studio/lint/packs/<lang>.json` `pace`, `key_number_pause` |
| `text_hold` | On-screen text stays up ≥ the per-char/per-word rule (zh 0.27 s/char + 0.5 s) | `motion-qc` `text_hold` | `HOLD_RULES` in `studio/qc/motion_qc.mjs`, derived from `pace.comfortable_per_s` |
| `contrast` | Text contrast ≥ 4.5:1 | `motion-qc` `contrast` | `studio/qc/motion_qc.mjs` |
| `flashes` | ≤ 3 flashes per second | `motion-qc` `flashes` | `studio/qc/motion_qc.mjs` |
| `sfx_sync` | SFX peak lands 0–2 frames after its picture event | `motion-qc` `sfx_sync` | `studio/qc/motion_qc.mjs` |
| `deterministic` | Every frame is a pure function of `t`; re-render is identical | `render-contract` lint **and** `qc/determinism.json`, written by every episode render (see below); missing, stale, or mismatched fails | `docs/render-contract.md` |
| `no_ai_phrasing` | No AI phrasing or jargon in the voice-over | `qc` item `script_lint` (`lint-script`) | `studio/lint/packs/<lang>.json` |
| `claims_sourced` | Every material claim has a source (fact card A/B/C) | `qc` item `fact_card_abc` | `fact_card.md` |
| `claims_typed` | Numbers declare their quantity type; no mixing (e.g. "fairer" is not "faster") | `qc` item `claim_precision` (`studio/claims.mjs`) | `QUANTITY_TYPES` |
| `hero_move_and_banned` | Each shot has exactly one hero move; no move uses a banned kind | `motion-qc` `shots` | `BANNED_KINDS` in `studio/qc/motion_qc.mjs` + spec `banned` |
| `banned_list_in_brief` | The brief names the defaults this episode must not use | brief `## Banned motion` section | `studio/templates/brief.md` |

Inputs the gates read from the episode: `brief.md`, `fact_card.md`, `script.md`, `lines.json`, `qc/motion.json` (the motion spec measured from the draft, same format as `motion-qc`, with a `shots` array of `{id, moves: [{kind, role: "hero"|"secondary"}]}`), and optionally `qc/determinism.json` (`{"first": [hashes], "second": [hashes]}` from two renders of the same frames). A missing `qc/motion.json` fails the motion gates.

## Tier 2 — Human review (person only)

Four questions. A person answers them in `qc/release.json` → `quality_review` (`answer: "yes"|"no"`, `checked_by`). Agents must not fill these fields; names that look like an agent are rejected, and `yes` without `checked_by` stays pending.

Each question has short guidance to make the call faster. The guidance is a set of prompts, not a rubric to score.

1. `hook_5s` — After the first 5 seconds, does the viewer want to keep watching?
   - Is there a clear question or tension in the opening, stated in the viewer's own terms?
   - Can a first-time viewer follow it without pausing or rewinding? First-watch comprehension is the video equivalent of usability.
   - Does the opening earn attention through content, not through effects?
2. `key_still` — Is every key still presentable on its own?
   - Does each frame show deliberate design intent: type, colour, layout, and spacing chosen, not defaulted?
   - Is the visual hierarchy obvious, with one focal point per frame?
   - Does the style suit the audience and the topic, rather than following a current trend?
3. `takeaway` — After watching, can the viewer state the takeaway in one sentence, and do they want to try it?
   - Is the takeaway stated once, plainly, and supported by what was shown?
   - Did every technique (3D, simulation, effects) help explain something? 3D belongs only where it shows structure that a flat view cannot.
   - Is there a concrete next step the viewer can take on their own?
4. `whole_piece` — Does it work as one whole piece: visuals, voice, pacing, and content pulling in the same direction, with nothing that looks good but does not fit the content?
   - Each part being good is not enough; the parts must also work together.
   - Look for anything that is attractive in isolation but pulls against the content: decoration, music, or motion that draws the eye away from the point.
   - Technique serves the explanation, never display for its own sake.

### Weights

There are no fixed weights between the questions yet. For children's education content, resolve trade-offs in this order: content and comprehension first, visual craft second, novelty third. Fixed weights will be set from real episode data (completion, replays, viewer feedback) once enough episodes have shipped.

### Excluded on purpose

Criteria that only apply to interactive websites, such as navigation, keyboard operation, and SEO, are not part of this standard. A video is watched linearly; the viewer does not navigate, operate controls, or rely on page markup. The useful part of those criteria, whether the audience can follow without effort, is covered by first-watch comprehension under `hook_5s` and by the `pace` and `text_hold` gates.

## Audience profiles (optional)

Set `audience_profile: <id>` in the brief front matter to add a profile from `studio/profiles/<id>.json`. Leave it blank for the general standard. Adding a profile means adding a JSON file; the code does not know any profile by name.

`children-education` adds the gate that holds for every children's episode:

| Gate | Rule | Check |
|---|---|---|
| `profile_no_anxiety` | No anxiety or comparison framing | phrase list per language in the profile, over the brief and `lines.json` |

It also lists `suggested_techniques` (`guess-before-reveal`, `try-it-at-home`). Those are situational, so they are techniques chosen per episode in `## Approach`, not profile gates. See `docs/techniques.md`.
