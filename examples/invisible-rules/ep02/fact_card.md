# Fact card · invisible-rules / ep02

Numbers on screen or in the voice come from this episode’s simulation (`sim/results.json`) or from a source named in A. A sentence you have not read is not a checked fact.

One thing: when several cashiers share one line, a later arrival cannot start service ahead of you. When each cashier has a line and everyone picks the shortest, about four in ten people are overtaken.

## A. General claims (external sources)

| # | On-screen claim | Source | Confidence / notes |
|---|---|---|---|
| A1 | One shared queue feeding several servers is a single-queue multi-server system; in theory it is more efficient than a queue per server | MBA Wiki “queuing theory”: https://wiki.mbalib.com/wiki/%E6%8E%92%E9%98%9F%E8%AE%BA | Encyclopedia, medium. Only the supermarket paragraph in the search hit was read. That paragraph’s numeric example is a random-split algorithm; this film does not use those numbers |
| A2 | People care when first-come, first-served is broken; a later arrival leaving first feels unfair | Richard C. Larson, “Perspectives on Queues: Social Justice and the Psychology of Queueing”, *Operations Research* 35(6):895–905, 1987. https://doi.org/10.1287/opre.35.6.895 | Journal, higher. Abstract only: social injustice = FIFO broken. Full text not read |
| A3 | People prefer a short slow line to a long fast line even when the wait is the same | Alex Stone, “Why Waiting Is Torture”, *The New York Times*, 2012-08-18. https://www.nytimes.com/2012/08/19/opinion/sunday/why-waiting-in-line-is-torture.html | Newspaper, citing Carmon and Kahneman. Article read; original study not read. The film only says “a long snake looks scary”, no percentage |
| A4 | A web claim: “a snake is three times faster than separate lines” | Modb reprint of “Queuing theory” by 生有可恋, 2022-07-27: https://www.modb.pro/db/447116 | Personal blog reprint, low. Used only as “this rumor exists”. Corrected by B4, C2 |
| A5 | Merging lines is not always better: customer reaction, jockeying, and slower service after a merge can cancel the gain | Rothkopf & Rech, *Operations Research* 35(6):906–909, 1987. https://doi.org/10.1287/opre.35.6.906 | Journal, higher. Abstract only. Held as C3 |
| A6 | The single-line result is checked with Erlang C | Wikipedia “M/M/c queue”: https://en.wikipedia.org/wiki/M/M/c_queue | Encyclopedia, formula is checkable. Used only to check the sim, not on screen |

## B. Simulated or auditable numbers (this episode)

Model: 3 cashiers; Poisson arrivals; mean service 2 minutes, baseline exponential; peak load ρ = 0.9 (1.35 people/min); 120,000 people per seed, drop first 2,000; seeds 1–20; both rules see the same people and the same service draws. “Pick shortest” = on arrival choose the fewest heads (including the person in service), ties random, no jockeying. “Overtaken” = someone who arrived later starts service earlier. Script: `sim/queue_sim.py`. Results: `sim/results.json`.

Check: single-line mean wait 5.55 min vs Erlang C 5.45 min (`baseline.check_erlang_c_pooled_mean_wait_min`), about 2% apart.

| # | On-screen number | Value | Quantity type | Scene | Field |
|---|---|---|---|---|---|
| B1 | Share overtaken (three lines, everyone picks shortest) | 40.3%, spoken “四成” | proportion | baseline, mean of 20 seeds; per-seed 39.7%–41.3% | `baseline.pick_shortest.share_overtaken.mean` |
| B2 | Mean number of people who pass you, if you are overtaken | 4.1, on screen “约 4 人” | average | baseline | `baseline.pick_shortest.mean_overtakers_if_overtaken.mean` |
| B3 | Share overtaken in one line | 0 | fairness | baseline (FIFO by definition; sim also 0) | `baseline.pooled.share_overtaken.mean` |
| B4 | Blind pick vs one line, mean-wait ratio | 3.3× | average | baseline only, to correct “3× faster” | `derived.baseline_pick_random_over_pooled_mean_wait_ratio` |
| B5 | Everyone picks shortest vs one line, extra mean wait | 31s, spoken “半分钟” | average | baseline; every paired seed is shorter for one line (28.9–32.7s) | `derived.baseline_pick_shortest_minus_pooled_mean_wait_s` |
| B6 | One-line mean wait (end card) | 5.5 min | average | baseline | `baseline.pooled.mean_wait_min.mean` |
| B7 | Pick-shortest mean wait (end card) | 6.1 min | average | baseline | `baseline.pick_shortest.mean_wait_min.mean` |

Sensitivity (not on screen): load 0.8 / 0.95 and service CV 0.5 / 1.5. Pick-shortest overtaken share 29.5%–47.8%. Extra wait 14–40s. One line is shorter in every case and seed. So “four in ten” must be labeled “peak-hour sim”; a quiet store is closer to three in ten.

## C. Known limits / do not say

- C1 “Four in ten overtaken” and “half a minute” are a simplified sim, not a store, bank, or station measurement. Label the picture and the end card.
- C2 Do not say “a long line is three times faster”. 3× holds only for a blind pick (B4). If people pick shortest, the average gap is about half a minute (B5).
- C3 Customers only count heads and never jockey; walking to a free cashier is free. Real people look at carts and switch. A5 notes those effects can cancel the merge. Do not say “one line is always better”.
- C4 Do not tell a named retailer, city, or store to change. No real maps or brands.
- C5 No source for “what share of Chinese supermarkets or banks use a snake or a ticket”. Do not invent that share.
- C6 Do not say “switching lines is faster / slower”. The model does not simulate jockeying.
- C7 “You cannot see how long the person in front will take” is a model mechanism (random service, visible headcount only). It is not a psychology result.
- C8 Do not sell fairness as speed, and do not sell a group average as this viewer’s next visit.
