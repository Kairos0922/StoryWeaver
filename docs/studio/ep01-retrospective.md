> 原文收入，供闸门和停做清单对照。文中的耗时与 QC 描述是复盘当时的观察。播放数据当时不存在，现在也不补。

# 《看不见的规则》EP01 深复盘 → Creation Studio 结晶

- 对象：首发集「电梯为啥不理你」（v1 → v2）
- 目的：不是再打磨一集，而是抽出可复用的 skill / 工作室管线
- 依据：`/workspace/invisible-rules/` 产物、[stickman-video-director](https://github.com/kaomei/stickman-video-director)、既有 [StoryWeaver 分析](file:///workspace/storyweaver-analysis.md)、Opus 5.5 研究、`voice_tests/x_research_voice.md`
- **不编造**本集发布后的播放/完播数据（当前没有）

---

## A. 实际发生的过程时间线

| 阶段 | 做了什么 | 关键产物 | 闸门 |
|---|---|---|---|
| 选题 | 横屏知识讲解系列方向 → 选「看不见的规则」；EP01 电梯 | 选题讨论（对话） | 用户认可方向 |
| 事实/模拟 | 集选控制调研 + numpy 模拟（16 层、10 种子） | `ep01/fact_card.md`、`ep01/sim/results.json`、`both_buttons.json` | 数字只能来自模拟/标注来源 |
| 脚本 v1 | 单旁白、信息量大（单梯+三梯派梯） | `ep01/script.md`（~576 字） | **无人工结构闸** → 直接进制作 |
| 配音 v1 | edge-tts Yunxi +4% | `ep01/audio/` | — |
| 成片 v1 | Canvas + Playwright 逐帧 | `ep01/out/ep01_elevator_1080p30.mp4` | QC：字幕框 / Whisper / 字形 |
| 用户反馈 | 画面糙、要 IP、声音不像人、脚本 AI 味、要讲人话 | — | **硬闸：先不做重渲** |
| Phase 1 | 3 IP 概念 + `script_v2.md` + TTS A/B（edge/ChatTTS/Cosy/豆包） | `ip/`、`script_v2.md`、`voice_tests/` | 用户选 E3 豆包情感版 |
| 配音 v2 | Doubao seed-tts-2.0-expressive，三角色，md5 缓存 | `ep01/v2/audio/`，**684 字 / 27 次** | 字数预算 <3000 |
| 成片 v2 | 重写 `render/index.html`、角色精灵、图表、自合成 BGM | `ep01/v2/out/ep01_v2_1080p30.mp4`（150.9s） | 抽帧目视 → video → QC |
| 发布 | 用户侧发布（本 agent 未代发） | — | 需显式批准才可外发 |

**总耗时特征（从产物推断，非精确工时）：** v1 全链路先落地 → 几乎整条视觉/脚本/配音返工成 v2。返工成本 ≈ 重做一遍，不是「改几帧」。

**对照 StoryWeaver：** 引擎校验扎实、但「先造引擎再出片」的陷阱已在分析里写过。invisible-rules 这次是「先出片再结晶管线」——方向对，但**缺导演提案闸**，导致 v1→v2 全量返工。

---

## B. 什么有效 / 什么失败（带文件证据）

### 有效（应固化进 Studio）

1. **事实卡 + 模拟绑定数字**  
   `fact_card.md` 的 A/B/C 分区（外部来源 / 本片模拟 / 不能说的话）阻止了胡编。`script_v2` 自查明确砍掉「多按按钮更快」等无来源说法。`lines.py` 里 TTS 数字念法与字幕数字分离。

2. **IP 三角色分工清晰**  
   `ip/README.md`：等等=嘴替犯错、阿规=讲规则、嘀嗒=报数。参数化 SVG（`ip/src/chars.py`）→ `build_sprites.py` → 36 个精灵键。可跨集复用。

3. **配音选型有证据链**  
   `voice_tests/`：用户否决 ChatTTS/Cosy 怪声；X 调研指出中文区对固定 AI 腔极敏感；E3（解说小明 / 少年梓辛 / 知性灿灿 + `context_texts`）落地。TTS **按内容 hash 缓存**，重渲不重扣字。

4. **QC 清单可复用**  
   字幕安全区（1308 采样 0 越界）、Whisper A/V sync、fontTools 缺字检查（228 非 ASCII 全过）、联系表、AI 生成内容标、loudnorm −16 LUFS、disclaimer「简化模拟」。

5. **自合成 BGM/叮声**  
   `audio/mix.py` numpy 合成，避开版权不确定；人声段振幅比约 17%。

### 失败 / 半失败（Studio 必须挡）

1. **先渲后改结构**  
   v1 讲了单梯+三梯两套，v2 砍到「一件事+上下都按」，但 150.9s 仍偏长；平台钩子窗口是前 2–5 秒，我们钩子后还有片名卡 + 早上八点长叙事（L03 达 7.0s）。

2. **「去 AI 味」自查只禁了套话，没禁结构**  
   `script_v2.md` 自查写「没用你有没有想过/让我们/总而言之…」，但成片仍有：说人话：、记住一件事就够了、第一二三、原来是在帮大家省时间、这笔账大家一起付。

3. **画面密度不够**  
   同一栋 8 层剖面反复用；角色常站在图表旁「旁观」；转场几乎只有 crossfade；数字条是「长出来」而不是「一拍一个认知冲击」。对比 stickman「每 2–3 秒必须有可见变化」。

4. **缺少 Phase A 导演提案闸**  
   stickman 明确：提案未批不得进生产提示词。我们是脚本通过 → 直接 TTS → 直接全片渲染。贵的返工发生在成片后。

5. **ASR 假阳性与真问题混在一起**  
   L08「掐」曾识别成「揭」；成片整轨识别又正常。没有「人耳听关键句」硬闸，只有 JSON 阈值。

6. **StoryWeaver 轮子未接上**  
   分析结论是「不要再造引擎」。我们却又写了一套 ad-hoc Canvas（`ep01/v2/render/index.html` 252 行），没有抽成共享 scene kit / beat clock。下集还会复制粘贴。

---

## C. 内容/钩子缺口 vs stickman-video-director

仓库：https://github.com/kaomei/stickman-video-director  
核心 skill：`skills/directing-stickman-videos/SKILL.md` + `references/storyboard-template.md`

### 可直接偷的模式（与画风无关）

| # | stickman 模式 | EP01 实际 | 差在哪 |
|---|---|---|---|
| 1 | **五步心流**：黄金钩子→打破常识→拉出内幕→真相揭秘→升华互动 | hook→problem→rule→data→both→tips→outro（功能分段，情绪弧弱） | tips 是讲义清单，不是「升华+站队」 |
| 2 | 钩子 2–5s 内反常识致命追问/视觉悖论 | 「上下都按…」→立刻甩「+7.5秒」→「啊？」——结构对，但后接 7s 早晨叙事稀释冲击 | 钩子后应立刻打「你以为的」再打碎，而不是换场景重开 |
| 3 | **每 10s 三拍**（0–3 / 3–7 / 7–10），≥4 种视觉装置 | 场景按台词长度漂移；L09 一段 10.1s 堆四个数 | 缺 beat 强制时钟 |
| 4 | **每 2–3s 可见变化** | 长段剖面图只动轿厢；图表旁角色站桩 | 角色 idle 违规（stickman: Never leave character idle） |
| 5 | 结尾**评论区站队题** | 「下期：长队还是短队？」是预告，不是本集站队 | 应逼观众表态：「你上下都按过吗？评论区扣 1/2」之类（需合规自然） |
| 6 | Setup gate + **Approval gate**（提案批了才 Phase B） | 选题批了、IP/E3 批了，但**分镜/钩子强度未单独批** | 最贵的洞 |
| 7 | 不编造事实 | 我们已做到（fact_card） | **保持**，这是优势 |
| 8 | 画幅决定调度（16:9 左右调度 / 9:16 纵深） | 只有 16:9；未为视频号/抖音做 9:16 重组 | Studio 要双画幅模板 |

### EP01 套进五步心流的「应有结构」（示例，非整稿）

1. **钩子（0–4s）**：画面——你在 5 楼按「下」，轿厢从 3 楼上行路过**门都不开**。旁白：「不是没看见你。」  
2. **打破常识（4–15s）**：大家都以为「谁先按谁先坐」→ 一句话打碎 → 甩出 31.9 vs 24.3。  
3. **内幕（15–45s）**：顺路接人机制，用动画「捎一串 / 来回折腾」对比，**一个机制一个画面**。  
4. **真相爽感（45–75s）**：上下都按 = 白停一站；+7.5 / +1.2；等等脸垮。  
5. **升华互动（75–90s）**：一句金句 + **评论站队题**（不是三条 tip 念稿）。Tips 改成画面卡片 3 秒闪过，口播只留一句总原则。

目标时长：**90s 内**（横屏知识向）；竖屏版另做 45–60s 切条。

---

## D. 脚本 AI 味：仍在用的模式 + 改写原则

### 仍出现的模式（摘自 `script_v2.md` / `lines.py`）

| 模式 | 例句 | 为什么像 AI |
|---|---|---|
| 元叙述标签 | 「说人话：…」 | 作者跳出来解释「我要讲人话了」 |
| 总结脚手架 | 「记住一件事就够了：…所以——」 | PPT 过渡句 |
| 口播念序号 | 「第一…第二…第三…」 | 清单文；短视频应屏幕出卡、嘴只说一句 |
| 过完整的道德回收 | 「原来是在帮大家省时间」 | 角色替观众把课做完，无留白 |
| 工整比喻收束 | 「这笔账，大家一起付」 | 金句感强但「写」出来的 |
| 信息密度句 | L03 7s 塞场景+动作+情绪；L09 10s 四个数 | TTS 念稿，不是对话节拍 |
| 假设条款入话 | 「假设每五个人里有一个…而且只坐…」 | 论文方法段进了口播；应压到字幕小字 |

v1 更重：`script.md` 开场「其实每部电梯背后，都有一套派车规则。今天我们用模拟，把它跑给你看」——典型 AI 讲解片开场。

### 改写原则（写进 skill）

1. **冲突先于命名**：先让观众觉得「被冒犯」，再给规则名；专有名词最多出现一次，且屏幕出、嘴可省略。  
2. **一拍一数**：口播每次只丢一个数字；对比数字用切镜/双条，不在同一句念完。  
3. **删脚手架**：禁「说人话/简单来说/换句话说/记住一件事/所以——/值得一提」。  
4. **清单不上嘴**：tips 用卡；VO 只留总原则一句。  
5. **方法放脚注**：模拟假设 → 角标/片尾/字幕小字，不进口播主链。  
6. **对话要有拒绝**：等等被说服前要有一次「不服」停顿，不要立刻「行吧原来…」。  
7. **人声朗读测试**：写完后用 E3 合成钩子 15 秒，**人听**是否想划走，再批全稿。  
8. **评论题必须本集可答**：站队题绑定本集行为，下期预告另卡 2 秒。

---

## E. 视觉质量缺口 vs Opus 5.5 + 应进管线的 polish 步骤

### Opus / 程序化爆款的共性（研究刷新）

- 单 HTML/Canvas，**确定性**时间轴；大号数字/kinetic type；**约 2 秒一个新信息**。  
- Prompt 里写 **Avoid** 清单比写「精美」有效（Anthropic 设计建议，stickman/Opus 提示同构）。  
- 质检：固定时刻 stills（0s / 中点 / 结尾）、字幕与音频 ≤2 帧误差、文字不重叠。  
- 工具层已有轮子：Remotion、HyperFrames、Manim、StoryWeaver——**不要再从零写渲染器**。

### 我们 v2 仍缺的 polish

| 缺口 | 证据 | 管线补丁 |
|---|---|---|
| 无镜头运动语言 | `index.html` 几乎固定机位 | scene kit：push/pan/shake 语义动作 |
| 角色常 idle | 图表场景角色站桩 | stickman 规则：每拍至少一个角色动作 |
| 示意图复用过度 | 8 层楼贯穿 problem/rule/both | 每段换视觉隐喻（队列折线、白停印章已有苗头，要系统化） |
| 数字出场弱 | 条形图缓动出现 | 大号 kinetic 数字先砸脸，再缩成图 |
| 转场单一 | PREV canvas crossfade | 匹配剪（轿厢门→图表门）、擦除、物体过镜 |
| 无 beat clock | 时间跟台词走 | `timeline` 强制 2.5s tick，画面事件挂 tick |
| 双画幅未做 | 仅 1920×1080 | 同一 TL 出 16:9 + 9:16 安全区模板 |

### 固化进管线的 polish 步骤（每集必跑）

1. Phase A 分镜表：每 10s 一行，三拍，≥4 装置（抄 stickman 表头）。  
2. 静帧闸：钩子 2.5s、第一个数字砸脸、最大爽点、结尾站队 —— 四张人工过目。  
3. Avoid 清单进渲染规范：无 emoji（已踩坑）、无未嵌入字体、无角色裁切、无字幕贴边、无「示意」图冒充数据。  
4. 全片渲染前只渲 8–12s 钩子样片。  
5. 成片后 contact_sheet + 人耳听钩子 + 人耳听数字句。

---

## F. Creation Studio 架构提案

### 阶段与人工闸（硬性）

```
选题卡 ──闸0──► 事实卡+模拟 ──闸1──► 导演提案Phase A
   (钩子口述15s+五步心流+时长+画幅+调性)
        ──闸2──► 台词表 lines.json（禁脚手架词表自动扫）
        ──闸3──► TTS 钩子样片人耳
        ──闸4──► 静帧4张人耳/人目
        ──► 全量 TTS（缓存）→ 时间轴 → 渲染 → 混音
        ──闸5──► QC自动+人耳关键句 → 成片包
        ──闸6──► 发布文案+AI声明 → 人工点发布
        ──► 发布后指标回填
```

闸的规则抄 stickman：`Topic approval ≠ Phase A approval`；全局改画幅/时长/结构 → 作废重批。

### 可复用资产

| 资产 | 路径约定 | 说明 |
|---|---|---|
| IP 角色 | `ip/src/chars.py` + sprites | 跨集；表情枚举冻结 |
| 系列视觉合同 | `studio/visual_contract.md` | 调色板、字体、AI 标、安全区 |
| 配音合同 | `studio/voice_contract.md` | E3 三角色 + ctx 模板 + 字数预算 |
| 事实卡模板 | `studio/templates/fact_card.md` | A/B/C 区 |
| 分镜模板 | `studio/templates/phase_a.md` | 五步心流 + 10s 行 |
| 禁词/禁结构表 | `studio/lint_script.py` | 扫「说人话/第一第二…」 |
| QC 套件 | `studio/qc/*` | 从 ep01/v2/qc 抽离 |
| 场景组件 | `studio/render/kit/` | building、bar_compare、stamp、tip_cards、kinetic_number |
| 模拟器（按题） | `epXX/sim/` | 有数字的集才建 |

### 目录约定

```
invisible-rules/
  studio/           # skill、模板、kit、qc、合同（本报告所在）
  ip/               # 跨集角色
  voice_tests/      # 选型证据（冻结，不每集重测）
  epXX/
    fact_card.md
    phase_a.md      # 导演提案（需批准标记）
    script.md
    lines.py|json
    sim/            # 可选
    audio/          # tts 缓存 + timeline + mix
    render/         # 本集构图，尽量只调 kit 参数
    qc/
    out/            # mp4 cover contact_sheet srt
    post/           # 发布文案、平台、指标回填（空模板）
```

### Skill `SKILL.md` 大纲（建议新建 `studio/skills/directing-invisible-rules/SKILL.md`）

```yaml
name: directing-invisible-rules
description: 把一个「日常里看不见的规则」主题做成中文横/竖屏知识讲解成片；强制事实卡、五步心流、人工闸、豆包E3三角色、Canvas kit 渲染与 QC。
```

章节建议直接映射 stickman 结构，但换成我们的后端：

1. Core contract（一件事、可带走的行为、数字来源）  
2. Setup gate（画幅、时长、主题、是否有模拟）  
3. Phase A（五步心流 + 分镜表 + 禁词自检）→ **停等批准**  
4. Phase B（lines → TTS 缓存 → timeline beat clock → kit 渲染 → mix）  
5. QC gate + 发布闸  
6. Revision：改结构必须回到 Phase A  
7. Final checklist（抄 evaluation-rubric 风格，可测）

**不要** fork stickman 去接 Gemini Omni——我们的差异化是：中文事实严谨 + 自有 IP + 可审计模拟数字 + 程序化中文画面。画风可吸收其「密度与闸门」，渲染继续代码向（可评估 HyperFrames/Remotion/StoryWeaver 谁接 kit 成本低，而不是再写 252 行单集 HTML）。

### 发布后指标（`epXX/post/metrics.md` 模板字段）

- 平台 / 发布时间（UTC+8） / 画幅  
- 完播率、平均观看时长、2s/5s 跳出（有再填，**禁止估**）  
- 评论区：站队题回复数、纠错数、「AI 味/假声」负面数  
- 返工：Phase A 修改次数、TTS 字数、全量重渲次数  
- 决策：下集保留/淘汰的钩子类型

---

## G. Top 10 具体改动（EP02 起，按优先级）

1. **上 Phase A 闸**：无批准的 `phase_a.md` 禁止 TTS/渲染。  
2. **五步心流改稿 + 目标 ≤90s**：tips 改卡片闪过；结尾本集站队题。  
3. **`lint_script.py`**：脚手架词 + 口播「第一第二第三」+ 单句 >40 字告警。  
4. **钩子样片优先**：只做前 12s，人耳+人目过了再全量。  
5. **beat clock 2.5s**：画面事件挂 tick；禁止 >5s 无新视觉元素。  
6. **抽 `studio/render/kit`**：kinetic_number、bar_compare、stamp、character_slot；ep02 禁止复制整份 index.html。  
7. **评估接入现成渲染**（StoryWeaver / HyperFrames / Remotion）接 kit，选一个；停住「每集手写 Canvas」。  
8. **双画幅**：同一 TL 出 9:16（视频号/抖音主发）+ 16:9（B 站）。  
9. **人耳闸关键句**：数字句、钩子、角色名；ASR 只做辅助。  
10. **`post/metrics.md` 强制回填**后再开 ep03 选题——用真实完播说话。

---

## H. 停止做什么

1. **停：没导演提案就开全量 TTS/全片渲染。**  
2. **停：用「自查没有套话」代替结构去 AI 味。**  
3. **停：口播念「第一第二第三」和「说人话」。**  
4. **停：一集塞两套机制**（v1 单梯+三梯）；一集一件事。  
5. **停：每集从零写渲染 HTML**；停继续堆 StoryWeaver 引擎功能（分析已结论）。  
6. **停：把模拟方法段读进主旁白。**  
7. **停：角色站桩听讲解**；无动作的拍视为 QC 失败。  
8. **停：无版权把握的外部 BGM**；继续自合成或明确授权库。  
9. **停：用 ASR 分数替代人耳**（掐/揭类问题）。  
10. **停：编造或估算发布数据**；没有就空着。  
11. **停：把下期预告当成互动升华。**  
12. **停：在未批准时代发平台 / 代发评论。**

---

## 附录：关键路径速查

| 用途 | 路径 |
|---|---|
| 本复盘 | `studio/ep01-retrospective.md` |
| 成片 v2 | `ep01/v2/out/ep01_v2_1080p30.mp4` |
| 封面/总览 | `ep01/v2/out/cover.png`、`contact_sheet.jpg` |
| 台词/时间轴 | `ep01/v2/lines.py`、`audio/timeline.json` |
| TTS 用量 | `ep01/v2/audio/usage.jsonl`（684 字） |
| 事实卡 | `ep01/fact_card.md` |
| IP | `ip/README.md`、`ip/src/chars.py` |
| 配音调研 | `voice_tests/x_research_voice.md` |
| StoryWeaver 分析 | `/workspace/storyweaver-analysis.md` |
| stickman skill | https://github.com/kaomei/stickman-video-director/tree/main/skills/directing-stickman-videos |

---

## 一句话结晶

> **Studio = stickman 的闸门与心流 + 我们的事实卡/IP/豆包E3/QC + 共享 render kit；禁止再「写完稿就渲全片」。**
