---
status: approved
series: invisible-rules
episode: ep02
language: zh
model_budget_calls: 400
model_budget_stop_ratio: 0.7
historical_example: true
aspect: "16:9"
target_duration_s: 80
produce_vertical: false
vertical_duration_s: ""
structure_revision: 0
approved_by: Kairos
approved_at: 2026-10-10
approved_aspect: "16:9"
approved_duration_s: 80
approved_produce_vertical: false
approved_vertical_duration_s: ""
approved_structure_revision: 0
approved_body_sha256: 3eb3122e1df9d0556182d0df5288c19b6d40804b4b323ed27af6a4d3cb0aa2e9
approval_note: "Kairos approved the original Chinese brief via chat 2026-10-10 (hook H1, landscape only). This English file is a translation of that plan, plus a viewer-intuition table filled from the later retrospective so the example matches the current contract."
---

# Creative brief · invisible-rules / ep02 · One long line, or three short ones?

Topic approval is not brief approval. Until `status` is `approved` and the body hash matches, do not run full TTS or a full render.

Production agents must not edit `status`, `approved_by`, `approved_at`, or any `approved_*` field.

## One thing

When several cashiers share one line, nobody who arrives later can start service ahead of you. When each cashier has a line and everyone picks the shortest, about four in ten people are overtaken. Takeaway: if you see one snake to several windows, join it.

Numbers: `fact_card.md` B1–B5, raw `sim/results.json`.

## Viewer intuition

| # | Viewer’s private objection | When that is true | Our reply (fact-card B only) | Line ids |
|---|---|---|---|---|
| I1 | “If nobody is stuck ahead, the short line is fastest.” | When the people in front of you finish quickly | Grant that. You cannot see who will get stuck. When everyone picks shortest, about 40% are overtaken (B1). A single line’s promise is order, not a personal time win (B3, B5 is an average). | L06 |

The approved 2026-10-10 plan picked H1 for “strongest offense” and did not write this table. The spoken script still grants I1 late. New episodes must acknowledge I1 before the first break.

## Topic and hook

The topic is the EP01 teaser: long line vs short lines. Viewers already queue; the sim is stable (20 paired seeds, the single line is shorter every time, B5); there is a fight-worthy rumor (“three times faster”, A4/B4/B5); everyone can answer the stance question.

Rejected topics: bus bunching, congestion without a crash. Both need a new vehicle model and a weaker action.

| Candidate | First line | Picture | Why / risk |
|---|---|---|---|
| H1 (chosen) | Dengdeng: “He came later. Why did he leave first?” Dida: “Four in ten get overtaken.” | A late shopper with one bottle pays and waves | Everyone has lived it; paradox in 2s, number in 4s (B1). Risk: label “peak-hour simplified sim” on the 40% |
| H2 | “The web says a snake is three times faster. That only holds if you pick blind.” | A 3× stamp, then cancelled | Debunk energy. Risk: most viewers have not heard the claim; the film turns into a fact-check |
| H3 | “You always pick the wrong line? It is not luck.” | Dengdeng switches three times; the old line moves | Self-deprecation. Risk: the model does not simulate jockeying (C6) |

## Aspect

- Main frame: landscape `16:9`, 1920×1080.
- Vertical: not in this brief. If 9:16 is required, set `produce_vertical` true before approval. Do not crop later.
- Changing aspect voids approval.

## Duration

- Landscape target 80s, cap 90s.
- 22 lines, about 271 Chinese characters. At 4.5 characters/s that is ~60s of speech plus gaps. That planning rate is now over the cap (use ≤ 4.0). The 80s figure is an estimate, not a measurement.

## Five-beat story

1. Hook (0–6s): A late shopper leaves first and waves. Dida stops a watch. “40%” hits. No title card. No cut to another room.
2. Break the assumption (6–20s): Dengdeng says he always picks shortest. Agui: those four in ten already did. Then one number: the overtaken are passed by about four people (B2). One mechanism line: you can see headcount, not service time (C7).
3. Mechanism (20–45s): Three lines zip into one snake; the head walks to a green light. Split screen of one cashier stuck. Dida says zero (B3).
4. Payoff (45–68s): Dengdeng brings “three times faster” (A4). Dida: that needs a blind pick (B4); if you pick shortest, the gap is about half a minute on average (B5). Dengdeng asks what that buys; Agui answers with order, not speed. Dengdeng joins.
5. Audience stance (68–80s): One principle. Three tip cards, not spoken. Vote: A = one snake, B = pick a short line. No next-episode teaser.

Say one number at a time. 5.5 vs 6.1 minutes stay on bars and the end card. Seeds and Poisson arrivals stay in small type.

## Storyboard

One row per 10 seconds. Three cells: 0–3 / 3–7 / 7–10. Picture clock 2.5s. Extra people are silent grey silhouettes, not speaking roles.

| Window | 0–3s | 3–7s | 7–10s | Devices | Character action | Voice point |
| --- | --- | --- | --- | --- | --- | --- |
| 0–10s hook | Eye-level three cashiers; push in on Dengdeng in the middle; left silhouette paying | Silhouette finishes, waves, exits; light camera hit; Dengdeng turns, mouth a circle | “40%” slams in; small type “peak-hour · simplified sim” | push, pan, kinetic number, character action | Dengdeng on toes, then whips around; Dida jumps in and stops a watch | He came later — four in ten get overtaken |
| 10–20s break | Dengdeng taps his chest; headcount cards 4 / 4 / 5 | Agui slaps “everyone picks shortest” onto 40%; the number shakes and stays | Top-down: each silhouette holds a closed box; boxes open onto uneven timers | cards, cut, compare bars, character action | Dengdeng “impossible”; Agui slaps the card; Dida opens boxes | Those four in ten already picked shortest. You see heads, not service time |
| 20–30s mechanism | “About 4 people”; four silhouettes slide past Dengdeng | Agui snaps; three lines zip into one snake (match cut, no dissolve) | Pull out: the head walks to a green cashier | kinetic number, match cut, push, pan, character action | Dengdeng shrinks as he is passed; Agui’s hands close the lines; Dida points the green | About four people pass you. One line, three windows |
| 30–40s mechanism | Dengdeng sees the snake and steps back | Split: three lines vs one snake; the same cashier jams; red “stuck” stamp | Left line freezes; right snake still feeds two greens | split, stamp, character action, timer | Dengdeng stamps a foot; Agui points at the two live windows | A short line stuck is a dead wait. A snake can still move |
| 40–50s payoff setup | “0” hits the snake; small type “overtaken by a later arrival” | Push in: numbers 1–4 on heads, order holds | Dengdeng holds a flat card “rumor: 3× faster” (not a fake screenshot) | kinetic number, push, cards, character action | Dida hops with a 0; Dengdeng raises the card | Zero overtakes in one line. Is the snake faster? |
| 50–60s payoff | “3×” hits; Dida covers his eyes; stamp “only if you pick blind” | 3× shrinks to two bars: 5.5 vs 6.1 (small type; not spoken) | The gap becomes “half a minute”; a watch hand moves half a turn | kinetic number, stamp, compare bars, timer, character action | Dida gropes, then points at the gap; Dengdeng leans in | Blind pick is 3×. If you pick shortest, the average gap is about half a minute |
| 60–70s payoff | Dengdeng opens his hands; push to his face | Agui points at the tail: new silhouettes stay behind Dengdeng | Dengdeng sighs, walks to the tail; pan follows | push, pan, character action, cards | Dengdeng sighs and walks; Agui points at the tail; Dida hands a ticket | What do I get? You get the people behind you staying behind you |
| 70–80s stance | Title card “do not hate the snake” | Three tip cards ~1s each, not spoken | Split A (one snake) / B (three shorts); Dengdeng looks both ways | cards, kinetic number, split, pan | Agui holds a sign; Dengdeng looks to camera; Dida waves A or B | Join the snake. Comment A or B |

Camera: at least one push, pull, or pan per row. Transitions are line-morphs, split pushes, stamps — not one crossfade. Schematic motion is labeled. Numbers come from B.

## Review stills

Four 1920×1080 frames from the shared kit (`render/stills.json` → `stills/`):

| File | Time | Job |
| --- | --- | --- |
| `stills/s1_hook_2s5.png` | ~2.5s | Hook: the late arrival leaves first |
| `stills/s2_first_number_8s.png` | ~8s | First number: 40% |
| `stills/s3_payoff_40s.png` | ~40s | Payoff: same jam, zero overtakes in the snake |
| `stills/s4_vote_76s.png` | ~76s | Stance: A or B |

Palette is this episode’s proposal, not a frozen brand sheet.

## Hook sample

Before full voice, make about the first 12 seconds (two hook lines plus the first break). A person listens, then signs `ear_hook` and `first_watch`.

## Approval

The reviewer edits only the front matter: copy scope into `approved_*`, write `hash-brief` into `approved_body_sha256`, set a person’s name and a date. Later edits expire the approval.
