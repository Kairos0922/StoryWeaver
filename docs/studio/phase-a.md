# Phase A 分镜闸

Phase A 是导演提案，不是口播润色。模板在 `studio/templates/phase_a.md`。

## 必须写清

- 一件事，和观众能做的一个动作。
- 画幅。主画幅 `16:9` 或 `9:16`。两档都做就写 `16:9+9:16`，或把 `produce_vertical` 设为 `true` 并填写竖屏秒数。
- 时长。横屏不超过 90 秒，竖屏不超过 60 秒。
- 五步：钩子 → 打碎常识 → 内幕 → 真相 → 评论站队。
- 分镜表。每 10 秒一行，列里是 0–3 秒、3–7 秒、7–10 秒、至少四种视觉装置、角色动作、一句口播要点。
- 钩子的说法要能在约 12 秒内听完。

钩子之后直接打「你以为的」，不要切到一段新的早晨叙事把冲击冲掉。结尾的站队题必须能用这一集的行为回答。下期预告是另一张约 2 秒的卡。

对比数字用切镜或双条。嘴上一次只说一个数。方法、种子、泊松到达，放事实卡或片尾小字。

## 什么叫可以送审

`node studio/cli.mjs gate <episode-dir> phase-a` 打印 `PHASE_A_READY_FOR_REVIEW`。

空的「待填」行、缺了五步、时长超限，都是 `PHASE_A_INCOMPLETE`。EP01 的重建稿还会因为 `status: reconstructed` 和空分镜停在 `PHASE_A_REQUIRED`。那是故意的。

## 什么叫批准

只有审片人改文首：

1. `status: approved`
2. `approved_by` 是人名
3. `approved_at` 是 `YYYY-MM-DD`
4. `approved_aspect`、`approved_duration_s`、`approved_produce_vertical`、`approved_vertical_duration_s`、`approved_structure_revision` 与当前值一致
5. `approved_body_sha256` 等于 `node studio/cli.mjs hash-phase-a <phase_a.md>` 的输出

哈希只覆盖文首之后的正文。画幅和时长在文首里再对一次，所以只改秒数也会过期。

制作代理不写这些字段。送审时停下来，把 `PHASE_A_READY_FOR_REVIEW` 交给人。

## 什么情况作废

任一情况都把 `status` 改回 `draft`，把 `structure_revision` 加一，并清空 `approved_*` 与哈希：

- 改画幅或竖屏开关
- 改目标秒数
- 改五步的顺序、删掉一步、把一件事换成另一件事
- 改分镜表里任何一拍

然后重新跑 `gate phase-a`。旧的批准不能继续用来开全量 TTS。`gate render` 会打印 `PHASE_A_STALE`。

## 和别的批准的差别

用户点头说「这个系列可以做」「用这个角色」「用 E3」，只完成了选题、IP 和音色。分镜强度是另一张纸。EP01 缺的就是这张纸，所以 v1 到 v2 几乎整片重做。
