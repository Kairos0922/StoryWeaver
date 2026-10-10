# invisible-rules / ep02 · 一条长龙，还是三条短队

草稿，停在 Phase A 审批闸。`gate phase-a` 为 `PHASE_A_READY_FOR_REVIEW`。Phase A 未批准之前，禁止全量 TTS 和全片渲染。

| 文件 | 是什么 |
|---|---|
| `fact_card.md` | A 外部来源、B 模拟数字（每个上屏数字对应 `sim/results.json` 字段）、C 不能说的话 |
| `phase_a.md` | 导演提案：一件事、三个钩子候选、五步心流、80 秒分镜。`status: draft`，等人批 |
| `script.md` | 口播稿。`lint-script` 0 错 0 警告 |
| `sim/queue_sim.py` → `sim/results.json` | 3 个收银台，一条队 vs 人人挑最短，20 个种子 |
| `render/stills.json` → `stills/*.png` | 四张送审静帧的镜头参数和图。角色是占位造型 |
| `lines.json` | 空。Phase A 批准后再填，再跑 `gate lines` |
| `qc/checklist.json` | 人工项全部 pending |

```bash
python3 series/invisible-rules/ep02/sim/queue_sim.py
node studio/cli.mjs lint-script series/invisible-rules/ep02/script.md
node studio/render/kit/canvas/render_stills.mjs series/invisible-rules/ep02
node studio/cli.mjs gate series/invisible-rules/ep02 phase-a
```

审片人批准的方法写在 `phase_a.md` 末尾。批准后才可以做约 12 秒钩子样片，并把人耳结果写入 `qc/checklist.json`。
