# Visual contract

House rules for any series that uses this toolkit. Palette, type files, and safe-area pixels belong in the series folder once they are measured. This file only states rules that do not depend on one brand.

## Required

- One timeline can emit 16:9 and 9:16. Vertical is not a center crop of landscape. Review each safe area.
- Captions stay off the edge and off faces and kinetic numbers.
- Fonts are embedded as per-episode WOFF2 subsets. A missing-glyph check (any face, Noto included) fails doctor and the release.
- Noto Sans CJK SC is the default. Other fonts are opt-in per episode from an external OFL library; they are never vendored into the repo.
- Every frame is `seek(t)` and then the shared WebGL post pass. Draft frames include the label `Not human-reviewed`.
- No emoji.
- Characters are not cropped at the face or the gesture.
- A frame marked “schematic” cannot sit next to a number that sounds measured. Numbers come from the fact card.
- A kinetic number hits first, then shrinks into a chart. A bar that eases in is not the beat.
- Every 2.5s visual beat has a visible change, including at least one character action.
- Do not use one crossfade for the whole film. Match on an object, wipe, or carry an element through the cut.
- An AI-generated-content mark sits in a fixed on-screen slot and is repeated in the publish copy.

## Forbidden

- A one-off HTML page written from scratch for one episode.
- External music without a written license. Prefer synthesized beds or a named licensed library.
- Characters standing still while a chart explains.

## Review stills

Before a full render, look at four frames: hook (~2.5s), first number, payoff, closing stance. The renderer also writes one thumbnail per shot and a contact sheet. The reviewer writes their name in `qc/checklist.json`. Release sign-off is a separate file, `qc/release.json`, written after the draft.
