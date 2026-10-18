# Fact check

A knowledge video needs correct claims. The fact check gate makes each claim traceable. The gate
also blocks voice synthesis until a person signs the claim ledger. No agent can guarantee zero
errors. The agent finds sources and runs the gate. A subject expert reads the sources and signs.

## Run the check

```bash
node studio/cli.mjs fact-check <episode-dir>
```

Exit 0 is `FACT_CHECK_OK`. Exit 1 is `FACT_CHECK_FAILED` with a list of issues. `openEpisodeTts`
also runs this gate before it loads a TTS adapter.

## Ledger

The ledger is `qc/fact_check.json`.

| Field | Job |
|---|---|
| `script_sha256` | Binds the ledger to `script.md` |
| `lines_sha256` | Binds the ledger to `lines.json` |
| `review.by` | A person |
| `review.at` | A date |
| `claims[].id` | `F1`, `F2`, and so on |
| `claims[].kind` | `fact`, `mechanism`, `estimate`, `analogy`, or `pedagogy` |
| `claims[].line_ids` | The lines that carry the claim |
| `claims[].source` | Title and URL or citation |
| `claims[].status` | `verified`, `single-source`, `estimate`, `analogy`, `pedagogy`, or `unsupported` |
| `claims[].note` | Limits and reading notes |

Edit `script.md` or `lines.json`. The old hashes become stale. Re-hash the ledger after the edit.

## Kinds and statuses

| Kind | Required status | Rule |
|---|---|---|
| `fact` | `verified` | Source needs a URL or a citation |
| `mechanism` | `verified` | Source needs a URL or a citation |
| `estimate` | `estimate` | Note the approximation and label it on screen |
| `analogy` | `analogy` | Note that it is a metaphor |
| `pedagogy` | `pedagogy` | Cite the curriculum or textbook |

`single-source` and `unsupported` fail a fact or a mechanism. Find a second source or the primary
source. You can change the claim to an estimate and say so on screen.

## Source order

1. Primary: a paper, a standard, a textbook, or government data.
2. Authoritative: a government agency, a university, a museum, or an industry standard.
3. Secondary: popular science or news. Use it as a pointer.
4. Derived: a calculation from other claims. Mark it as an estimate.
5. Curriculum: a standard for a pedagogy claim.
6. Analogy: a visual metaphor. Label it.

## Limits

- The gate does not judge the science. The expert does.
- The gate is not in `quality` or `deliver` yet. Run it before TTS and before release.
- The fact card is separate. The fact card holds sources and forbidden claims. The ledger holds
  line-level claims and the reviewer decision.

## Corrections

If a published episode is wrong, add a correction to `post/metrics.md` or the platform. Correct the
source and the claim. Increase the episode version. Do not edit a claim in a published file without
a note.
