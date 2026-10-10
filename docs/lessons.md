# Lessons (generalized)

Source episodes: Invisible Rules EP01 (elevator) and EP02 (one line vs three lines). The Chinese spoken scripts stay in `examples/`. The rules below are series-agnostic.

These are observations from production files and reviewer notes. They are not published watch-time claims. Where a number is missing, the field stays blank.

## What held

- A fact card with A/B/C stopped invented numbers.
- Hash-locking the creative brief stopped full TTS before a person had seen the plan.
- Voice-over lint cleared scaffold phrases (“in plain words”, “remember this one thing”, spoken ordinals).
- A 2.5s picture clock kept the longest dead stretch under 5s.
- Caching TTS by content hash avoided a second bill on a re-render.
- Self-synthesized music avoided an unclear license.

## What leaked

| Gap | What to do now |
|---|---|
| Lint caught words, not structure | Brief + first-watch. Scaffold-free copy can still be a lecture. |
| Impact hook without the viewer’s rebuttal | Required intuition table. Acknowledge before the first break. |
| Average sold as “you, this time” | Quantity type on every B row; average words are mandatory. |
| Fairness mixed with speed | Do not answer “why bother?” with a speed number. |
| Picture clock fixed, voice too fast | Separate caps. Chinese 4.0 characters/s; English 2.8 words/s. |
| Agent signed a human item | `checked_by` rejects agent-like names. |
| ASR “pass” on a dry line, fail in the mix | Ear on the mixed number lines. ASR is assistive. |
| Cloud agent had no TTS key | Preview without voice; TTS on the machine that holds keys. |
| “Speak fast” in emotion cues | Warning. Urgency is tone. |

## Stop doing

1. Full TTS or a full render without an approved brief.
2. Treating a self-check list as proof the structure is not AI-flavored.
3. Reading “first, second, third” or “in plain words”.
4. Two mechanisms in one episode.
5. A one-off HTML page per episode.
6. Reading the simulation method in the main voice.
7. Characters standing still through an explanation.
8. Music without a written license.
9. Replacing a human ear with an ASR score.
10. Estimating publish metrics.
11. Using a next-episode teaser as the stance beat.
12. Posting or commenting for the user.
13. Planning at 4.5 Chinese characters/s.
14. Opening on the most shocking number without first granting the viewer’s objection.
15. Signing a human checkpoint as an agent, even locally, even if you plan to revert it.

## Studio ideas worth keeping

From public motion-studio writeups (including the GrokBot / Opus 5.5 studio article): a skill is the playbook; the folder is the state machine; a human approval file is a real file; `seek(t)` is the only render entry; a contact sheet is judged before a full encode; banned defaults are named; one renderer, one queue; fonts come from disk. Those ideas are adopted as method, not as a vendor lock-in.
