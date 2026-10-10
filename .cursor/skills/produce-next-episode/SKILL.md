---
name: produce-next-episode
description: 制作 StoryWeaver 系列的下一集，先做《看不见的规则》ep02。强制事实卡、五步心流、Phase A 人工闸、口播 lint 和 QC。Phase A 未批准时禁止全量 TTS 和全片渲染。不调用付费配音，不编播放数据。
---

# 制作下一集

工作室生产一集可发布的知识短片。价值在事实卡、闸门和 QC。渲染用现成适配器，不新写物理引擎，也不新写一集一份的页面。

先读 `docs/studio/pipeline.md`、`docs/studio/phase-a.md`、`docs/studio/avoid.md`。EP01 的教训在 `docs/studio/ep01-retrospective.md`。EP01 的稿子是反例样品，不要改写成下一集。

## 不要做的事

- 不要把 `phase_a.md` 的 `status` 写成 `approved`，不要填写 `approved_by` 或正文哈希。那是审片人的动作。
- 不要在 `PHASE_A_APPROVED` 之前准备全量台词配音或全片渲染。`lint-script` 可以随时跑。
- 不要调用豆包、ChatTTS、CosyVoice 或任何付费接口。本仓库没有这个步骤。
- 不要编完播率、观看时长、跳出或评论数。没有导出就留空。
- 不要代发视频或评论。
- 不要把 `metrics_exception` 抄到新的一集。
- 不要扩展 `src/renderers/svg.js` 来做这一集。

## 0. 开目录

系列目录必须已经存在。第一支新稿：

```bash
node studio/cli.mjs init-episode series/invisible-rules ep02
```

`METRICS_REQUIRED` 表示上一集的播放指标还空着。不要填假数字来绕过。EP01 是唯一的历史例外，所以 `ep02` 可以开，`ep03` 不行。

## 1. 闸 0 和闸 1

编辑 `fact_card.md`。

- 只保留一件事。两套机制就拆成两集。
- A 区每句都有来源。没通读的 PDF 要写明没通读。
- B 区的每个上屏数字都指向 `sim/` 里的字段。没有结果文件，就不要写秒数。
- C 区写下不能说的话。

`sim/` 只在本集需要数字时才放脚本和原始结果。

## 2. 写 Phase A，然后停

填 `phase_a.md` 的五步和至少一行分镜。分镜格里不要留「待填」。横屏不超过 90 秒，竖屏不超过 60 秒。

角色动作用中文写可见动作。等等、阿规、嘀嗒的分工在 `series/invisible-rules/ip/README.md`。不要发明第四个角色，不要给音色和角色配对，除非生产笔记里已经有对应关系。

```bash
node studio/cli.mjs gate series/invisible-rules/ep02 phase-a
```

结果必须是 `PHASE_A_READY_FOR_REVIEW`。把这个结果交给人，然后停止。不要运行 `hash-phase-a` 之后自己把哈希写回去。

人批准之后，你才能继续。若你改正文，把 `status` 改回 `draft`，把 `structure_revision` 加一，清空 `approved_*`，再送审。

## 3. 口播

按五步写 `script.md`。引语用 `>`，说话人用 `等等：` 这种前缀。`## 自查` 放在最后。

```bash
node studio/cli.mjs lint-script series/invisible-rules/ep02/script.md
```

有 `ERROR` 就改，直到退出码为 0。警告里的长句和「假设」也要处理：长句拆开，假设挪到事实卡或片尾。

然后把通过的引语填进 `lines.json`。一句一个对象，`beat` 用五步的中文名。字幕数字和配音读法不要自己发明第二套。

```bash
node studio/cli.mjs gate <episode-dir> lines
```

`LINES_ALLOWED` 之前，不要做钩子样片。

## 4. 样片、静帧、全片

这一仓库的 CLI 到闸门为止，不出 MP4。

1. `gate hook-sample` 为 `HOOK_SAMPLE_ALLOWED` 之后，只用适配器做约前 12 秒。人耳听。把 `ear_hook` 写成 `pass`，填 `checked_by` 和听了哪一段。没有人名不要写 pass。
2. 做四张静帧。人看完再写 `stills_four`、`beat_clock`、`no_idle`。
3. `gate render` 打印 `RENDER_ALLOWED` 之后，才可以用适配器做全片。适配器还没选定，也不要临时装一个付费服务。选适配器的标准在 `studio/render/adapters/README.md`。
4. 全片之后人耳听数字句和角色名。ASR 只能当辅助。响度目标是 −16 LUFS，但没有测量文件就不要填读数。
5. `gate publish` 打印 `PUBLISH_ALLOWED` 之后，把发布文案和 AI 声明交给人。人点发布。

画面遵守 `studio/contracts/visual_contract.md`。配音遵守 `studio/contracts/voice_contract.md`。

## 5. 发布之后

把真实导出抄进 `post/metrics.md`。抄的时候同一行写 `来源：`。没有的格子留空。

用真实完播决定下一种钩子留不留。不要开 `ep03` 的选题，除非 `ep02` 的指标已经带来源。

## 改结构

改五步、画幅或时长，就是新的 Phase A。回到第 2 步。不要在成片上直接改一句再整片重渲。
