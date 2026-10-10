# invisible-rules / ep02

草稿。Phase A 未批准之前，禁止全量 TTS 和全片渲染。

1. 填 `fact_card.md` 的 A/B/C。
2. 填 `phase_a.md`。分镜表至少一行写满。
3. 填 `script.md`，再运行 `node studio/cli.mjs lint-script script.md`。
4. 运行 `node studio/cli.mjs gate . phase-a`。结果应是 `PHASE_A_READY_FOR_REVIEW`。
5. 等人批准。不要自己把 `status` 改成 `approved`。
6. 批准后才可以做约 12 秒钩子样片，并把人耳结果写入 `qc/checklist.json`。
