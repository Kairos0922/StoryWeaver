# 模拟

`queue_sim.py` 生成 `results.json`。需要 Python 3 和 numpy，单机约 20 秒，结果由种子决定，可复现。

```bash
python3 series/invisible-rules/ep02/sim/queue_sim.py
```

- 3 个收银台，泊松到达，平均结账 2 分钟。基线负荷 0.9、结账时间为指数分布。
- `pooled`：一条队，谁空了队头去谁那儿。
- `pick_shortest`：三条队，到达时挑人数最少的那条，不换队。
- `pick_random`：只在基线里跑，作为「快三倍」说法的参照，不上屏。
- `sensitivity`：负荷 0.8 / 0.95，结账时间更稳或更散。
- `baseline.check_erlang_c_pooled_mean_wait_min`：单队平均等待的公式值，用来核对模拟。

片中用到的字段抄在 `../fact_card.md` B 区。模型参数不进口播。
