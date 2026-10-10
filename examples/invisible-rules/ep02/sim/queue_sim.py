"""EP02 queue simulation: one shared line vs. three separate lines.

Model (kept out of the voice-over; see fact_card.md section B):
- 3 identical cashiers, Poisson arrivals, i.i.d. service times.
- pooled: one FIFO line, the head of the line goes to whichever cashier frees first.
- pick_shortest: on arrival a customer joins the line with the fewest people
  (waiting + being served), ties broken at random, and never switches.
- wait = service start - arrival. A customer is "overtaken" when someone who
  arrived later starts service earlier.

Usage: python3 queue_sim.py  (writes results.json next to this file)
"""

import heapq
import json
import math
from collections import deque
from pathlib import Path

import numpy as np

SERVERS = 3
MEAN_SERVICE_MIN = 2.0
CUSTOMERS = 120_000
WARMUP = 2_000
SEEDS = list(range(1, 21))
TAIL_MIN = 10.0

BASELINE = {"rho": 0.9, "service": "exponential", "cv": 1.0}
SENSITIVITY = [
    {"rho": 0.8, "service": "exponential", "cv": 1.0},
    {"rho": 0.95, "service": "exponential", "cv": 1.0},
    {"rho": 0.9, "service": "lognormal", "cv": 0.5},
    {"rho": 0.9, "service": "lognormal", "cv": 1.5},
]


def service_times(rng, n, kind, cv):
    if kind == "exponential":
        return rng.exponential(MEAN_SERVICE_MIN, n)
    sigma2 = math.log(1.0 + cv * cv)
    mu = math.log(MEAN_SERVICE_MIN) - sigma2 / 2.0
    return rng.lognormal(mu, math.sqrt(sigma2), n)


def draw(seed, rho, kind, cv):
    rng = np.random.default_rng(seed)
    lam = rho * SERVERS / MEAN_SERVICE_MIN
    arrivals = np.cumsum(rng.exponential(1.0 / lam, CUSTOMERS))
    services = service_times(rng, CUSTOMERS, kind, cv)
    ties = rng.random((CUSTOMERS, SERVERS))
    return arrivals, services, ties


def run_pooled(arrivals, services):
    free = [0.0] * SERVERS
    heapq.heapify(free)
    start = np.empty_like(arrivals)
    for i, (a, s) in enumerate(zip(arrivals, services)):
        t = heapq.heappop(free)
        begin = a if a > t else t
        start[i] = begin
        heapq.heappush(free, begin + s)
    return start


def run_pick_shortest(arrivals, services, ties):
    lines = [deque() for _ in range(SERVERS)]
    last_departure = [0.0] * SERVERS
    start = np.empty_like(arrivals)
    for i, (a, s) in enumerate(zip(arrivals, services)):
        best, best_key = 0, None
        for k in range(SERVERS):
            line = lines[k]
            while line and line[0] <= a:
                line.popleft()
            key = (len(line), ties[i, k])
            if best_key is None or key < best_key:
                best, best_key = k, key
        begin = a if a > last_departure[best] else last_departure[best]
        start[i] = begin
        last_departure[best] = begin + s
        lines[best].append(begin + s)
    return start


def run_pick_random(arrivals, services, ties):
    last_departure = [0.0] * SERVERS
    start = np.empty_like(arrivals)
    choice = np.argmax(ties, axis=1)
    for i, (a, s) in enumerate(zip(arrivals, services)):
        k = choice[i]
        begin = a if a > last_departure[k] else last_departure[k]
        start[i] = begin
        last_departure[k] = begin + s
    return start


def overtaken(start):
    later_min = np.minimum.accumulate(start[::-1])[::-1]
    later_min = np.append(later_min[1:], np.inf)
    return start > later_min + 1e-12


def overtakers(arrivals, start, mask):
    """Exact count of later arrivals that started before customer i, for i in mask.

    Only people who arrived while i was still waiting can overtake i.
    """
    ends = np.searchsorted(arrivals, start, side="left")
    counts = np.zeros(len(start), dtype=np.int64)
    for i in np.flatnonzero(mask):
        counts[i] = int(np.count_nonzero(start[i + 1:ends[i]] < start[i]))
    return counts


def summarize(arrivals, start):
    keep = np.zeros(len(start), dtype=bool)
    keep[WARMUP:] = True
    wait = (start - arrivals)[keep]
    over_all = overtaken(start)
    over = over_all[keep]
    passed = overtakers(arrivals, start, over_all & keep)[keep]
    return {
        "mean_wait_min": float(wait.mean()),
        "p90_wait_min": float(np.percentile(wait, 90)),
        "share_wait_over_10min": float((wait > TAIL_MIN).mean()),
        "share_overtaken": float(over.mean()),
        "mean_overtakers_if_overtaken": float(passed[over].mean()) if over.any() else 0.0,
    }


def erlang_c_wq(rho, c=SERVERS, mean_service=MEAN_SERVICE_MIN):
    a = rho * c
    tail = a ** c / math.factorial(c) / (1 - rho)
    head = sum(a ** k / math.factorial(k) for k in range(c))
    p_wait = tail / (head + tail)
    mu = 1.0 / mean_service
    return p_wait / (c * mu - rho * c * mu)


def scenario(cfg, with_random=False):
    per_seed = {"pooled": [], "pick_shortest": []}
    if with_random:
        per_seed["pick_random"] = []
    for seed in SEEDS:
        arrivals, services, ties = draw(seed, cfg["rho"], cfg["service"], cfg["cv"])
        per_seed["pooled"].append(summarize(arrivals, run_pooled(arrivals, services)))
        per_seed["pick_shortest"].append(
            summarize(arrivals, run_pick_shortest(arrivals, services, ties))
        )
        if with_random:
            per_seed["pick_random"].append(
                summarize(arrivals, run_pick_random(arrivals, services, ties))
            )
    out = {"config": cfg, "seeds": SEEDS}
    for rule, rows in per_seed.items():
        keys = rows[0].keys()
        out[rule] = {
            k: {
                "mean": float(np.mean([r[k] for r in rows])),
                "min_over_seeds": float(np.min([r[k] for r in rows])),
                "max_over_seeds": float(np.max([r[k] for r in rows])),
            }
            for k in keys
        }
    paired = [
        60.0 * (s["mean_wait_min"] - p["mean_wait_min"])
        for p, s in zip(per_seed["pooled"], per_seed["pick_shortest"])
    ]
    out["paired_pick_shortest_minus_pooled_mean_wait_s"] = {
        "per_seed": paired,
        "min": float(min(paired)),
        "max": float(max(paired)),
    }
    if cfg["service"] == "exponential":
        out["check_erlang_c_pooled_mean_wait_min"] = erlang_c_wq(cfg["rho"])
    return out


def main():
    results = {
        "schema": "storyweaver.sim.ep02-queue.v1",
        "model": {
            "servers": SERVERS,
            "mean_service_min": MEAN_SERVICE_MIN,
            "customers_per_seed": CUSTOMERS,
            "warmup_discarded": WARMUP,
            "tail_threshold_min": TAIL_MIN,
            "arrivals": "poisson",
            "rules": {
                "pooled": "one FIFO line feeding 3 cashiers",
                "pick_shortest": "3 lines; join fewest people (waiting+in service); random tie-break; no switching",
                "pick_random": "reference only, baseline only: 3 lines chosen uniformly at random; not used on screen",
            },
        },
        "baseline": scenario(BASELINE, with_random=True),
        "sensitivity": [scenario(cfg) for cfg in SENSITIVITY],
    }
    b = results["baseline"]
    pooled_mean = b["pooled"]["mean_wait_min"]["mean"]
    results["derived"] = {
        "baseline_pick_shortest_minus_pooled_mean_wait_s": 60.0
        * (b["pick_shortest"]["mean_wait_min"]["mean"] - pooled_mean),
        "baseline_pick_random_over_pooled_mean_wait_ratio": b["pick_random"]["mean_wait_min"]["mean"]
        / pooled_mean,
        "sensitivity_share_overtaken_pick_shortest_range": [
            min(s["pick_shortest"]["share_overtaken"]["mean"] for s in results["sensitivity"]),
            max(s["pick_shortest"]["share_overtaken"]["mean"] for s in results["sensitivity"]),
        ],
        "sensitivity_pick_shortest_minus_pooled_mean_wait_s_range": [
            min(
                60.0 * (s["pick_shortest"]["mean_wait_min"]["mean"] - s["pooled"]["mean_wait_min"]["mean"])
                for s in results["sensitivity"]
            ),
            max(
                60.0 * (s["pick_shortest"]["mean_wait_min"]["mean"] - s["pooled"]["mean_wait_min"]["mean"])
                for s in results["sensitivity"]
            ),
        ],
    }
    path = Path(__file__).with_name("results.json")
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def line(name, block):
        p, s = block["pooled"], block["pick_shortest"]
        print(
            f"{name:<34} mean {p['mean_wait_min']['mean']:.2f} vs {s['mean_wait_min']['mean']:.2f} | "
            f"p90 {p['p90_wait_min']['mean']:.2f} vs {s['p90_wait_min']['mean']:.2f} | "
            f">10min {p['share_wait_over_10min']['mean']:.3f} vs {s['share_wait_over_10min']['mean']:.3f} | "
            f"overtaken {p['share_overtaken']['mean']:.3f} vs {s['share_overtaken']['mean']:.3f} "
            f"(x{s['mean_overtakers_if_overtaken']['mean']:.2f})"
        )

    b = results["baseline"]
    line("baseline", b)
    print("erlang-c check", round(b["check_erlang_c_pooled_mean_wait_min"], 3))
    r = b["pick_random"]
    print(f"reference pick_random mean {r['mean_wait_min']['mean']:.2f} p90 {r['p90_wait_min']['mean']:.2f}")
    for blk in results["sensitivity"]:
        c = blk["config"]
        line(f"rho={c['rho']} {c['service']} cv={c['cv']}", blk)


if __name__ == "__main__":
    main()
