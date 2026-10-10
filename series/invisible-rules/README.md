# 看不见的规则

横屏知识系列。一集只讲一件日常里看不见的规则，观众能带走一个具体做法。

- EP01「电梯为啥不理你」：闸门样品。没有走过 Phase A，不能当下一集的稿子用。
- EP02「一条长龙还是三条短队」：Phase A 已批。正式角色、音频驱动时间轴、无配音预览。

## 跨集资产

- `ip/`：等等、阿规、嘀嗒。角色表在这里，精灵图不在本仓库。
- `voice/`：这一系列采用工作室的豆包 E3 合同。不要每集重选音色。
- 画面规则：`studio/contracts/visual_contract.md`
- 配音规则：`studio/contracts/voice_contract.md`

## 新的一集

```bash
node studio/cli.mjs init-episode series/invisible-rules ep03
```

然后只填事实卡和 Phase A。`node studio/cli.mjs gate series/invisible-rules/ep03 phase-a` 出现 `PHASE_A_READY_FOR_REVIEW` 之后停下来，等人批准。

代理不要代发，不要把 `status` 写成 `approved`，不要编播放数据。
