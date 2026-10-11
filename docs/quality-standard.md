# Release quality standard — v1

Status: v1, 2026-10-11. This is a working standard. Revise it from real, published episodes: when a shipped cut shows a number here is wrong, change the number in its single source and note the episode in `CHANGELOG.md`. A value measured on a real episode beats a value from outside material until a real cut proves otherwise.

The standard applies to every topic, language, and audience. Audience-specific rules live in optional profiles (see below), never in the general gates.

Run it:

```
node studio/cli.mjs quality <episode-dir> [--json]
```

Exit 0: every machine gate passes and a person answered all three review questions "yes". Exit 3: machine gates pass, human review pending. Exit 1: a machine gate failed.

## Tier 1 — Machine gates (blocking)

Every gate reuses an existing check. `quality` only aggregates; fix a gate in its source check, not here.

| Gate | Rule | Enforced by | Single source of the number |
|---|---|---|---|
| `pace` | Narration at a comfortable pace (zh ~3.7 chars/s; hard caps 4.0 avg / 4.6 per line; en 2.8 / 3.2 words/s); key-number lines hold ≥ 0.9 s after | `qc` item `pace_ok` (`studio/pace.mjs`) | `studio/lint/packs/<lang>.json` `pace`, `key_number_pause` |
| `text_hold` | On-screen text stays up ≥ the per-char/per-word rule (zh 0.27 s/char + 0.5 s) | `motion-qc` `text_hold` | `HOLD_RULES` in `studio/qc/motion_qc.mjs`, derived from `pace.comfortable_per_s` |
| `contrast` | Text contrast ≥ 4.5:1 | `motion-qc` `contrast` | `studio/qc/motion_qc.mjs` |
| `flashes` | ≤ 3 flashes per second | `motion-qc` `flashes` | `studio/qc/motion_qc.mjs` |
| `sfx_sync` | SFX peak lands 0–2 frames after its picture event | `motion-qc` `sfx_sync` | `studio/qc/motion_qc.mjs` |
| `deterministic` | Every frame is a pure function of `t`; re-render is identical | `render-contract` lint; plus `qc/determinism.json` frame hashes when present | `docs/render-contract.md` |
| `no_ai_phrasing` | No AI phrasing or jargon in the voice-over | `qc` item `script_lint` (`lint-script`) | `studio/lint/packs/<lang>.json` |
| `claims_sourced` | Every material claim has a source (fact card A/B/C) | `qc` item `fact_card_abc` | `fact_card.md` |
| `claims_typed` | Numbers declare their quantity type; no mixing (e.g. "fairer" is not "faster") | `qc` item `claim_precision` (`studio/claims.mjs`) | `QUANTITY_TYPES` |
| `hero_move_and_banned` | Each shot has exactly one hero move; no move uses a banned kind | `motion-qc` `shots` | `BANNED_KINDS` in `studio/qc/motion_qc.mjs` + spec `banned` |
| `banned_list_in_brief` | The brief names the defaults this episode must not use | brief `## Banned motion` section | `studio/templates/brief.md` |

Inputs the gates read from the episode: `brief.md`, `fact_card.md`, `script.md`, `lines.json`, `qc/motion.json` (the motion spec measured from the draft, same format as `motion-qc`, with a `shots` array of `{id, moves: [{kind, role: "hero"|"secondary"}]}`), and optionally `qc/determinism.json` (`{"first": [hashes], "second": [hashes]}` from two renders of the same frames). A missing `qc/motion.json` fails the motion gates.

## Tier 2 — Human review (person only)

Three questions. A person answers them in `qc/release.json` → `quality_review` (`answer: "yes"|"no"`, `checked_by`). Agents must not fill these fields; names that look like an agent are rejected, and `yes` without `checked_by` stays pending.

1. `hook_5s` — After the first 5 seconds, does the viewer want to keep watching?
2. `key_still` — Is every key still presentable on its own?
3. `takeaway` — After watching, can the viewer state the takeaway in one sentence, and do they want to try it?

## Audience profiles (optional)

Set `audience_profile: <id>` in the brief front matter to add a profile from `studio/profiles/<id>.json`. Leave it blank for the general standard. Adding a profile means adding a JSON file; the code does not know any profile by name.

`children-education` adds:

| Gate | Rule | Check |
|---|---|---|
| `profile_no_anxiety` | No anxiety or comparison framing | phrase list per language in the profile, over the brief and `lines.json` |
| `profile_guess_before_reveal` / `profile_guess_order` | The viewer is invited to guess before the answer | brief `## Guess before reveal` filled; a `beat: "guess"` line precedes the first `beat: "reveal"` line |
| `profile_try_it_at_home` | One safe, low-cost thing to try after watching | brief `## Try it at home` filled |

The phrase list catches obvious wording only. Tone is still judged by the person answering the three questions.

## What is automated vs. documented only

- Automated: every row in Tier 1 and every profile row, given the inputs above.
- Partly automated: `deterministic` is a source lint unless `qc/determinism.json` exists; `hero_move_and_banned` trusts the motion spec's labels, which an agent writes from the draft; `no_ai_phrasing` catches listed phrases, not every awkward sentence.
- Documented only: the three human questions.
