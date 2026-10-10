# Simulation

`queue_sim.py` writes `results.json`. Needs Python 3 and numpy. About 20 seconds on one machine. Seeded and repeatable.

```bash
python3 examples/invisible-rules/ep02/sim/queue_sim.py
```

- 3 cashiers, Poisson arrivals, mean service 2 minutes. Baseline load 0.9, exponential service.
- `pooled`: one line; the head walks to a free cashier.
- `pick_shortest`: three lines; on arrival pick the shortest headcount; no jockeying.
- `pick_random`: baseline only, as a check on the “three times faster” rumor. Not for the screen.
- `sensitivity`: load 0.8 / 0.95, tighter or wider service times.
- `baseline.check_erlang_c_pooled_mean_wait_min`: closed-form mean wait for the single line, used to check the sim.

On-screen fields are copied into `../fact_card.md` section B. Model parameters stay out of the main voice.
