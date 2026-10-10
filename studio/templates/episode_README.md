# {{series}} / {{episode}}

Draft. Until the creative brief is approved, do not run full TTS or a full render.

1. Fill `fact_card.md` sections A/B/C, including quantity type on every B row.
2. Fill `brief.md`, including viewer intuition and at least one complete storyboard row.
3. Fill `script.md`, then run `node studio/cli.mjs lint-script script.md`.
4. Run `node studio/cli.mjs checkpoint . brief`. The result should be `BRIEF_READY_FOR_REVIEW`.
5. Stop. A person approves. Do not set `status: approved` yourself.
6. After approval, record the first three lines and run `predict-duration`. Then make a draft hook sample. A person signs `ear_hook` and `first_watch` in `qc/checklist.json`.
