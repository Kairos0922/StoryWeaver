# Opus 5.5 Case-Derived Design Decisions

## Evidence

The September 2026 public examples include Kevin Ngo's short narrative animation drawn frame-by-frame in JavaScript; a later report measured roughly 371K views, 4.8K likes and 2.2K bookmarks at a stated snapshot. citeturn0search1

Kevin Ngo also published Python animation rendered in Blender, reported at roughly 152K views and 2,451 likes in another snapshot. citeturn0search2

Chetaslua published pure-code visual/music/animation examples, including a post reported around 47K views and 991 likes at one snapshot. citeturn0search3

A public Opus 5.5 train-journey example was described as a roughly 45-minute one-shot JavaScript/riso-style animation and attracted substantial discussion in the Claude community. citeturn0reddit7turn0reddit8

These metrics are snapshots from third-party mirrors/reports and should not be treated as a stable leaderboard.

## What the cases imply for StoryWeaver

1. The product boundary must be a finished artifact: optimize for idea → story → visual language → deterministic artifact → QA, not prompt → SVG.
2. Story structure deserves a first-class schema: a scene list alone cannot represent why a viewer should continue watching.
3. Visual identity must be reusable: recurring characters, objects and motifs should have stable identities instead of being redrawn independently per scene.
4. Motion is a semantic primitive: fade, slide, scale, draw/reveal and emphasis should be renderer-level operations selected by the plan.
5. Style is a system, not a pile of colors: palette, typography, spacing, stroke language and motion defaults belong in the visual contract.
6. Code-generated audio is an optional extension: V1 keeps audio as an external track with deterministic muxing; beat metadata can synchronize visual changes.

## Engineering priorities

P0: beat-aware VideoSpec, reusable visual identities, semantic motion, deterministic transitions.

P1: richer chart/diagram primitives, beat markers, style presets, better mobile typography.

P2: procedural audio, advanced character rigs, 3D/cinematic backends.

## Non-goals

This research does not justify claiming that Opus 5.5 is required, that JavaScript video is universally superior, or that X engagement predicts self-media revenue.
