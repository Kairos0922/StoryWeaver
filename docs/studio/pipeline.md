# 工作室管线

一集的路径是闸门，不是「稿子写完就渲」。选题批准、角色批准、音色批准，都不能代替 Phase A 批准。

```text
选题卡
  闸0
事实卡 + 模拟（有数字才建 sim/）
  闸1
Phase A：钩子、五步心流、时长、画幅、10 秒分镜
  闸2  人批准。未批准则停止
台词 lines + 口播 lint
  闸3  只做约 12 秒钩子，人耳
  闸4  四张静帧，人眼
全量 TTS（缓存）→ 2.5 秒节拍时间轴 → 适配器渲染 → 混音
  闸5  QC 自动项 + 人耳听数字句和角色名
发布文案 + AI 声明
  闸6  人点发布。代理不代发
发布后指标。没有就空着
```

改画幅、目标时长或五步结构，批准作废，回到闸 2。

## 闸 0 · 选题

写明这一集只讲的一件事，以及观众能做的一个动作。一件事里不要塞两套机制。EP01 的 v1 同时讲了单梯和三梯派梯，v2 才砍掉，返工接近重做。

`node studio/cli.mjs init-episode <series-dir> epNN` 会生成空稿。`ep03` 及以后，上一集的 `post/metrics.md` 必须有带来源的实填项。`ep01` 没有播放数据，这个例外只写死在那一集，不能复制到新稿的文首。

## 闸 1 · 事实卡

用 `studio/templates/fact_card.md`。

- A：外部来源。写出处和有没有通读原文。
- B：本片模拟或可复核数字。每个上屏数字对应一个结果字段。
- C：不能说的话。没来源的快/慢、不能代表真实大楼的估算，写在这里。

口播和画面只允许使用 A 或 B 里的说法。C 里的句子不要出现在成片里。

## 闸 2 · Phase A

操作说明在 [phase-a.md](phase-a.md)。检查：

```bash
node studio/cli.mjs gate <episode-dir> phase-a
```

- `PHASE_A_INCOMPLETE`：结构不够，退出码 1。
- `PHASE_A_READY_FOR_REVIEW`：可以给人看，退出码 0。这时仍然不能配音、不能渲全片。
- `PHASE_A_APPROVED`：人已经批准，而且正文哈希、画幅、时长都没变。
- `PHASE_A_REQUIRED`：没有批准。渲染类闸门的退出码是 2。
- `PHASE_A_STALE`：批过之后正文或范围变了。退出码 2。

`lint-script` 任何时候都能跑，它不代表可以进 TTS。进 TTS 要看 `gate <dir> lines`。

## 闸 3 · 钩子样片

`gate <dir> hook-sample` 通过之后，只合成约前 12 秒，人听会不会划走。结果写入 `qc/checklist.json` 的 `ear_hook`，并写上 `checked_by`。没有人名的 `pass` 会被忽略。

不要用语音识别分数代替这一听。EP01 里「掐」曾经被识别成「揭」，整轨再识别又正常。

## 闸 4 · 静帧

全片之前看四张：钩子约 2.5 秒、第一个数字、最大爽点、结尾站队。同时看节拍和角色是否站桩。对应清单项是 `stills_four`、`beat_clock`、`no_idle`。

## 生产

全量配音按内容哈希缓存，字数预算少于 3000。时间轴以 2.5 秒为一拍，画面事件挂在拍上，不要让时长只跟着句子走。

渲染走适配器，见 `studio/render/adapters/README.md`。本仓库的 CLI 不渲染 MP4，也不调用豆包。

横屏和竖屏用同一条时间轴的两套安全区。竖屏目标 45–60 秒，横屏不超过 90 秒。

## 闸 5 · QC

```bash
node studio/cli.mjs qc <episode-dir>
```

自动项检查事实卡、一件事、Phase A、口播 lint、播放指标有没有被估出来。人工项保持 pending，直到有人听过或看过。清单说明在 `studio/qc/checklist.md`。

发布前还要人耳听数字句和角色名，确认模拟声明，并对照响度目标 −16 LUFS。这个响度是复盘里的管线目标。没有成片时不要填一个 LUFS 读数。

## 闸 6 · 发布

发布文案写上 AI 生成声明。人点发布。代理不代发，不代回评论。

然后把平台后台里真实有的数抄进 `post/metrics.md`。没有的格子留空。规则在 [metrics.md](metrics.md)。

## 命令

```bash
node studio/cli.mjs lint-script <script.md|lines.json>
node studio/cli.mjs qc <episode-dir>
node studio/cli.mjs gate <episode-dir> <phase-a|lines|hook-sample|stills|render|publish>
node studio/cli.mjs hash-phase-a <phase_a.md>
node studio/cli.mjs init-episode <series-dir> <epNN>
node studio/cli.mjs layout
```

退出码：0 表示这一闸通过，或 Phase A 已经可以送审；1 表示结构或清单还没完成；2 表示 Phase A 没批准或已过期。

`gate render` 在批准、lint、钩子人耳和四张静帧都通过之前，不会打印 `RENDER_ALLOWED`。
