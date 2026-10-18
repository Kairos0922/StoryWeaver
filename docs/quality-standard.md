# Quality standard

The quality standard is the release bar. The machine gates and the human gates work together.

## Machine gates

| Gate | Check |
|---|---|
| Fact card | A, B, and C are complete |
| Claim precision | A number has a type and a source |
| Fact check | Every claim is signed |
| Script lint | No error in the language pack |
| Pace | Speech rate and key-number hold |
| Text hold | The caption stays long enough |
| Render contract | The frame is a pure function of `t` |
| Determinism | Two fresh passes match |
| Glyph coverage | Each used character has a glyph |
| Style lock | No key outside the lock |
| Motion QC | One hero move for each shot |
| Director review | Every axis is at least 8 |
| Delivery | Chrome playback, seek, cover, sha256 |

## Human gates

| Gate | Person |
|---|---|
| Fact set | Confirms the claims |
| Brief | Approves and hash-locks |
| Stills | Looks at the frames |
| Director scorecard | Signs the scores |
| Voice trial | Hears the hook |
| Release | Signs `qc/release.json` |

## Rule

An agent never signs a human gate. If a name looks like an agent, the tool rejects it. Put machine
notes in `agent_precheck`.

## Review

A score of 8 is the minimum. Fix each score below 8. Do not average a low score with a high score.
A 3 in text overlap is still a 3.

## Release

`deliver` makes the package. The package has the file, the cover, the manifest, and the checksums.
A file from `out/` is not a release.
