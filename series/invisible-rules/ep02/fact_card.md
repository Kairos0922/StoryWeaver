# 事实卡 · invisible-rules / ep02

原则：画面和口播里的数字只来自本片模拟（`sim/results.json`），或来自下面 A 区点名的来源。来源没读到的句子，不要写成已核对。

本集只讲一件事：几个收银台共用一条队，后来的人就插不到你前面；各排各的，就算人人挑最短的那条，也有四成人被后来的人先结账。

## A. 一般性说法（有外部来源）

| # | 片中说法 | 来源 | 可信度 / 备注 |
|---|---|---|---|
| A1 | 「一条总队、队头分到空出来的窗口」叫单队多服务台；理论上比每个窗口各排一队效率高 | MBA 智库百科「排队论」：https://wiki.mbalib.com/wiki/%E6%8E%92%E9%98%9F%E8%AE%BA | 百科类，中等。只读了检索结果里的超市收银段落，没有通读全文。该段的数字例子是随机分队的算法，本片不引用它的数字 |
| A2 | 排队里人最在意「先来先服务」被打破，后来的人先走会让人觉得不公平 | Richard C. Larson, "Perspectives on Queues: Social Justice and the Psychology of Queueing", *Operations Research* 35(6):895–905, 1987. https://doi.org/10.1287/opre.35.6.895 （摘要页：https://ideas.repec.org/a/inm/oropre/v35y1987i6p895-905.html ） | 期刊论文，较高。只读了摘要：把 social injustice 定义为违反先进先出。没有通读全文 |
| A3 | 人们宁可排一条短而慢的队，也不愿排一条长而快的队，即使等的时间一样 | Alex Stone, "Why Waiting Is Torture", *The New York Times*, 2012-08-18. https://www.nytimes.com/2012/08/19/opinion/sunday/why-waiting-in-line-is-torture.html | 报纸评论，转述 Carmon 与 Kahneman 的研究。通读了这篇文章，没有读原始研究。片中只说「长龙看着吓人」，不说具体比例 |
| A4 | 网上流传「蛇形队比各排各的快三倍」 | 墨天轮转载《排队理论》，作者「生有可恋」，2022-07-27：https://www.modb.pro/db/447116 | 个人博客转载，低。只当「网上有这种说法」引用，本片用模拟纠正它（见 B4、C2） |
| A5 | 合并成一条队并不总是更好：顾客反应、换队、合并后服务变慢等因素可能抵消好处 | Michael H. Rothkopf & Paul Rech, "Perspectives on Queues: Combining Queues is Not Always Beneficial", *Operations Research* 35(6):906–909, 1987. https://doi.org/10.1287/opre.35.6.906 | 期刊论文，较高。只读了摘要。片中不展开，写进 C3 当限制 |
| A6 | 模拟的单队结果用 Erlang C 公式核对 | Wikipedia「M/M/c queue」：https://en.wikipedia.org/wiki/M/M/c_queue | 百科，公式可复算。只用于核对模拟，不上屏 |

## B. 模拟或可复核的数字（本片）

模型参数：3 个收银台；顾客按泊松过程到达；每人结账时间平均 2 分钟，基线为指数分布；高峰负荷 ρ = 0.9（每分钟 1.35 人）；每个种子 120,000 人，丢掉前 2,000 人做预热；种子 1–20，同一个种子下两种排法用同一批顾客和同一组结账时间。「挑最短」= 到达时看三条队谁人数最少（含正在结账的人），平手随机，排进去就不换。「被超车」= 有比你晚到的人比你先开始结账。脚本：`sim/queue_sim.py`，结果：`sim/results.json`。

核对：单队平均等待模拟值 5.55 分钟，Erlang C 公式值 5.45 分钟（`baseline.check_erlang_c_pooled_mean_wait_min`），差约 2%。

| 片中数字 | 值 | 场景 | 文件字段 |
|---|---|---|---|
| B1 被后来的人超车的比例（三条队，人人挑最短） | 40.3%，口播「四成」 | 基线，20 个种子平均；各种子 39.7%–41.3% | `baseline.pick_shortest.share_overtaken.mean` |
| B2 被超车的人，平均被几个人超过 | 4.1 人，上屏「约 4 人」 | 基线 | `baseline.pick_shortest.mean_overtakers_if_overtaken.mean` |
| B3 一条队里被超车的比例 | 0 | 基线（先进先出，按定义为 0，模拟也得到 0） | `baseline.pooled.share_overtaken.mean` |
| B4 闭眼随便挑一条队 vs 一条队，平均等待倍数 | 3.3 倍 | 基线，仅作纠正「快三倍」的参照 | `derived.baseline_pick_random_over_pooled_mean_wait_ratio` |
| B5 人人挑最短 vs 一条队，平均每人多等 | 31 秒，口播「半分钟」 | 基线；20 个种子逐一配对，每个种子都是一条队更短（28.9–32.7 秒） | `derived.baseline_pick_shortest_minus_pooled_mean_wait_s`；`baseline.paired_pick_shortest_minus_pooled_mean_wait_s` |
| B6 一条队平均等待（片尾小字） | 5.5 分钟 | 基线 | `baseline.pooled.mean_wait_min.mean` |
| B7 人人挑最短平均等待（片尾小字） | 6.1 分钟 | 基线 | `baseline.pick_shortest.mean_wait_min.mean` |

敏感性（不上屏，审片用）：负荷 0.8 / 0.95、结账时间更稳（变异系数 0.5）或更散（1.5）四种情况下，「挑最短」被超车比例在 29.5%–47.8%（`derived.sensitivity_share_overtaken_pick_shortest_range`），每人多等 14–40 秒（`derived.sensitivity_pick_shortest_minus_pooled_mean_wait_s_range`）。一条队在每种情况、每个种子下都更短。所以「四成」要标「高峰期模拟」；不忙的时候是三成左右。

## C. 已知局限 / 不能说的话

- C1 「四成被超车」「半分钟」是简化模拟，不代表任何一家超市、银行或车站的实测。画面和片尾要标「简化模拟」。
- C2 不能说「一条长队快三倍」。三倍只在「闭眼随便挑队」时成立（B4）；人会挑最短的，差距只剩半分钟左右（B5）。
- C3 模型里顾客只数人头、选了就不换队，也没算走到收银台的路程。现实里人会看购物车、会换队，一条长队走到空台也要几秒。A5 指出这些因素可能抵消合并的好处。片中不说「一条队永远更好」，只说本模型里的结果。
- C4 不说「超市应该改成一条队」或点名任何商家、城市、真实门店。不出现真实地图和真实品牌。
- C5 没有找到「中国超市、银行有多少比例用叫号或蛇形队」的来源，片中不说比例，也不说「大部分银行都这样」。
- C6 不说「换队更快 / 更慢」。模型没有模拟换队。
- C7 「你看不准前面那位要结多久」是模型里的机制：结账时间随机，选队时只看得到人数。不能说成心理学结论。
