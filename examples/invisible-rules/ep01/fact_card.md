Note: this is the EP01 production fact card. `sim/results.json` and `sim/both_buttons.json` are not in this repo. Numbers are the original card, not a re-run.

# Fact card · Invisible Rules EP01: why the elevator you want never arrives

Principle: numbers on screen or in the voice come from this episode’s simulation (`sim/results.json`). General claims use only the sources in A. Confidence is labeled.

## A. General claims (external sources)

| # | On-screen claim | Source | Confidence / notes |
|---|---|---|---|
| A1 | Common elevators use collective control: no attendant; they answer hall calls in the same direction | China Elevator Association, “Classification of elevators”: http://www.elevator.org.cn/index.php/con/703 | Trade body, higher |
| A2 | Collective-control mnemonic: stop for the same direction, skip the opposite, except the farthest reverse call | Encyclopedia entries for 集选控制: https://www.newton.com.tw/wiki/%E9%9B%86%E9%81%B8%E6%8E%A7%E5%88%B6/22093950 ; https://www.jendow.com.tw/wiki/%E9%9B%86%E9%81%B8%E6%8E%A7%E5%88%B6 | Encyclopedia, medium. **Re-check against a textbook or a national standard before a remake** |
| A3 | Banks of cars are dispatched by a group controller | Same as A1 (“group control”) | Higher |
| A4 | “Send the nearest car” is not optimal and often bunches cars | MERL TR2017-079: https://merl.com/publications/docs/TR2017-079.pdf ; Otis US5447212: https://www.freepatentsonline.com/5447212.html | Report/patent, higher. The film only says “near is not fast”; it does not use this episode’s sim to prove bunching (C3) |
| A5 | Real group control scores more factors (Otis RSR, remaining response time) | MERL TR2003-61: https://www.merl.com/publications/docs/TR2003-61.pdf | Higher |
| A6 | Some buildings use destination control: you enter the floor in the lobby, then the system names a car | Ruokokoski et al., EJOR 2016: https://sal.aalto.fi/publications/pdf-files/ejor2016_public.pdf | Paper, higher |

A1–A6 were checked against search excerpts. **The PDFs were not read in full.**

## B. Simulated numbers (this model, mean of 10 seeds)

Model: 16 floors (0 = lobby), 1.5s per floor, 5.0s per stop + 1.0s per boarding passenger, capacity 12, dt 0.25s; Poisson arrivals, mix 45% lobby-up / 30% down-to-lobby / 25% interfloor; 3600s per rule; seeds 1–10; both rules see the same passengers.

| # | On-screen number | Value | Quantity type | Scene | Field |
|---|---|---|---|---|---|
| B1 | First-come mean wait | 31.9s | average | 1 car, 120 people/hour | original `sim/results.json` (file not vendored) |
| B2 | Collective-control mean wait | 24.3s | average | same | same |
| B3 | Share waiting > 60s | 12.9% → 7.1% | proportion | same | same |
| B4 | Nearest-car mean wait | 30.0s | average | 3 cars, 500 people/hour | same |
| B5 | ETA-dispatch mean wait | 15.1s | average | same | same |
| B6 | Share waiting > 60s (3 cars) | 17.5% → 3.5% | proportion | same | same |
| B7 | Calls not sent to the estimated-fastest car | 48.3% | proportion | nearest-car | same |
| B8 | Those calls late vs ETA (estimate) | 21.9s | average | same; **estimate, not measured** | same |

P90, max wait, and per-seed rows were in `sim/results.json`.

## C. Known limits / do not say

- C1 “First-come, first-served” is a thought experiment, not real elevator behavior.
- C2 “ETA dispatch” here is a simplified estimate, not a vendor algorithm, and not a real building. The end card already says so.
- C3 A homemade “bunching” metric did not reproduce the literature, so the film does **not** use sim numbers to prove bunching.
- C4 The opening “the car is two floors below and turns away” is schematic (already labeled). It only introduces A2.
- C5 Do not add unsourced “pressing the button more times makes it faster/slower”.
- C6 Do not sell fairness as speed, and do not sell a group average as this viewer’s next ride.
