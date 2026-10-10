---
status: draft
series: {{series}}
episode: {{episode}}
aspect: "16:9"
target_duration_s: 90
produce_vertical: false
vertical_duration_s: ""
structure_revision: 0
approved_by: ""
approved_at: ""
approved_aspect: ""
approved_duration_s: ""
approved_produce_vertical: ""
approved_vertical_duration_s: ""
approved_structure_revision: ""
approved_body_sha256: ""
---

# Phase A · {{series}} / {{episode}}

选题通过不算本文件通过。`status` 不是 `approved`，或正文哈希对不上，就不能进全量 TTS 和全片渲染。

制作代理不要修改 `status`、`approved_by`、`approved_at`、`approved_*`、`approved_body_sha256`。

## 一件事

（待填。一句话。观众看完能做一个具体动作。）

## 画幅

- 主画幅：文首 `aspect`。横屏知识片用 `16:9`。
- 竖屏：要做 9:16 时，把 `produce_vertical` 写成 `true`，`vertical_duration_s` 写成 45–60 之间的秒数。
- 改画幅要作废批准，重新审。

## 时长

- 横屏 `target_duration_s` 不超过 90。文首的 90 是上限，改成这一集的目标秒数。
- 竖屏不超过 60。
- 改时长要把 `structure_revision` 加一，`status` 回到 `draft`，清掉全部 `approved_*`。

## 五步心流

1. 钩子（0–4 秒）：（待填。先让人觉得被冒犯或看见一个悖论。）
2. 打碎常识：（待填。一句打碎，再给一个数字。两个对比数字不要放在同一句。）
3. 内幕：（待填。一个机制，一个画面。）
4. 真相：（待填。角色被说服前要有一次不服。）
5. 评论站队：（待填。站队题必须能用本集行为回答。下期预告另做，不算这一步。）

钩子后不要换场景把冲击冲掉。Tips 用卡片闪过，口播只留一句总原则。

## 分镜

每 10 秒一行。三拍是 0–3 秒、3–7 秒、7–10 秒。视觉装置至少写四种里的四种名称，角色动作不能写「站着」。

节拍 2.5 秒。超过 5 秒没有新视觉元素，这行不算完成。

| 时段 | 0–3s | 3–7s | 7–10s | 视觉装置 | 角色动作 | 口播要点 |
| --- | --- | --- | --- | --- | --- | --- |
| （待填） | （待填） | （待填） | （待填） | （待填） | （待填） | （待填） |

可用的装置名：大数字、切镜、印章、角色动作、对比条、卡片、推拉、摇镜。不要在这一行还是待填时把装置名写成已经采用。

## 钩子样片

全量配音之前，只做约前 12 秒。人耳听完再批全稿。听的结果写进 `qc/checklist.json` 的 `ear_hook`，并填 `checked_by`。

## 批准

审片人确认正文后，只改文首：

1. 把当前 `aspect`、`target_duration_s`、`produce_vertical`、`vertical_duration_s`、`structure_revision` 抄到对应的 `approved_*`。
2. 运行 `node studio/cli.mjs hash-phase-a <本文件>`，把输出写入 `approved_body_sha256`。
3. `approved_by` 写人名，`approved_at` 写 `YYYY-MM-DD`，`status` 写成 `approved`。

之后再改正文或画幅时长，批准自动过期。
