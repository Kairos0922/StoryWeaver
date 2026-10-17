# Fact check (claim ledger)

Knowledge content is only as good as its claims. This gate makes every claim traceable and
blocks voice synthesis until a person signs the ledger. It is deliberately stricter than the
old fact card: a load-bearing fact or mechanism cannot be marked "single-source".

**No agent can guarantee zero errors.** The agent can build the ledger, find sources, and run
the gate. A human subject expert must read the sources and sign `review`. That signature is
the bottom line.

## Run it

```bash
node studio/cli.mjs fact-check <episode-dir>
```

Exit 0: `FACT_CHECK_OK`. Exit 1: `FACT_CHECK_FAILED` with the exact issues. The `openEpisodeTts`
entry point also refuses to load a TTS adapter unless this gate passes, so a line cannot be
voiced before the ledger is signed.

## The ledger

`qc/fact_check.json`:

```json
{
  "schema": "storyweaver.fact_check.v1",
  "episode": "ep01",
  "script_sha256": "<sha256 of script.md>",
  "lines_sha256": "<sha256 of lines.json>",
  "review": {
    "by": "<person>",
    "at": "YYYY-MM-DD",
    "statement": "I checked every claim against the cited source. No unsupported claim remains. Visual analogies are labeled."
  },
  "claims": [
    {
      "id": "F1",
      "claim": "骨头汤的钙含量约为每100毫升2–4毫克。",
      "kind": "fact",
      "line_ids": ["L09"],
      "source": {"type": "primary", "title": "…", "url": "https://…"},
      "status": "verified",
      "note": "which pages were read"
    }
  ]
}
```

- `episode` must match the episode folder name.
- `script_sha256` and `lines_sha256` bind the ledger to the exact script and line list. Edit
  either file and the ledger is `stale`; re-hash it after the edit.
- `review.by` / `review.at` are a person and a date. Agent-looking names are rejected, like
  every other human gate.
- Every `key_number` line in `lines.json` must be covered by a claim.

## Kinds and statuses

| `kind` | What it is | Required `status` | Extra rule |
|---|---|---|---|
| `fact` | an external, checkable statement or number | `verified` | source needs url or citation |
| `mechanism` | how something works | `verified` | source needs url or citation |
| `estimate` | a derived or approximate number | `estimate` | `note` required; label it on screen |
| `analogy` | a metaphor, not a literal claim | `analogy` | `note` required; label it |
| `pedagogy` | “this is in the grade-N curriculum” | `pedagogy` | cite the standard/textbook |

`single-source` and `unsupported` fail a `fact`/`mechanism`. `single-source` is a flag that
the claim is not yet verified: find an independent source, find the primary source, or change
the claim to an `estimate` and say so on screen. Do not “upgrade” it by editing the status
without reading the source.

## Source hierarchy

1. **primary** — peer-reviewed paper, official standard, textbook, government data.
2. **authoritative** — government agency, university extension, museum, industry standard.
3. **secondary** — science popularization, news. Useful as a pointer; not enough for a
   load-bearing `fact`/`mechanism` unless the expert has checked the underlying source.
4. **derived** — a calculation from other claims; mark `estimate`.
5. **curriculum** — a curriculum standard for a `pedagogy` claim.
6. **analogy** — a visual metaphor; mark `analogy` and say “not to scale” when relevant.

## What the gate does not do

- It does not judge whether a source is scientifically right; that is the expert’s signature.
- It does not yet run inside `quality`/`deliver`; run it before TTS and before release. Wiring
  it into those gates is the next step.
- It does not replace the fact card A/B/C. The fact card holds sources and prohibited claims;
  the ledger holds line-level claims and the reviewer’s decision.

## Corrections

If a published episode is found to be wrong: add a correction to the episode’s `post/metrics.md`
(or a correction card/comment on the platform), correct the source/claim in the ledger, and
bump the episode. The project forbids silently editing a published file’s claim without a note.
