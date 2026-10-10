# EP01 · 电梯为啥不理你

这是《看不见的规则》已经发布过的一集，用来给工作室当样品。样品证明闸门会拦住它，不是让人把它再渲一遍。

| 文件 | 是什么 |
|---|---|
| `script.md` | 口播 v2。有脚手架，lint 应该失败 |
| `fact_card.md` | 生产事实卡。A/B/C 都在。模拟结果文件不在仓库里 |
| `phase_a.md` | 按复盘补写的应有结构。`status: reconstructed`，分镜是空的 |
| `lines.json` | 从口播引语抽出的 25 句。不是当时 `lines.py` 的 27 次请求 |
| `post/metrics.md` | 播放数据留空。复盘写明当时没有 |
| `qc/checklist.json` | 人工项全部 pending |

仓库里没有这一集的 MP4、封面或精灵图。

下一集不要复制这套口播。用工作室模板开 `ep02`：

```bash
node studio/cli.mjs init-episode series/invisible-rules ep02
```

`ep01` 是唯一允许「没有播放数据仍可开下一集」的历史例外。`ep02` 发布并回填指标之前，不能开 `ep03`。
