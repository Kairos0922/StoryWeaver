# XML prompt control

Use `studio/templates/prompt.xml` when you plan an episode or a shot. The tags are a control
surface. They map to files that a machine can check. The prose gives the direction.

| Tag | Content | File |
|---|---|---|
| `<role>` | Code-driven motion designer, not a video model | Skill preamble |
| `<inputs>` | Topic, audience, format, fps, duration, style, palette, fonts, audio | `brief.md`, `series-style.json`, `lines.json` |
| `<direction>` | Visual law, banned list, tone | Brief and visual-rhythm |
| `<structure>` | Shot table: window, composition, motion, beat, transition | Brief storyboard and `render/scenes.json` |
| `<build>` | `window.render(t)`, Playwright, ffmpeg, stills, determinism, options | Render contract and commands |
| `<gotchas>` | Fonts, overlap, loop, beat gaps, inline easing, unverified capability | Preflight and review |
| `<start>` | Stills first, director score at least 8, then full | Human checkpoints |

## Reverse constraints

A model left alone repeats a default style. It uses a dark background, centered text, a default
fade, bounce easing, and decorative particles. The banned list in `<direction>` stops that
regression. Keep the list in each prompt.

## Pipeline map

- `window.render(t)` or `window.seek(t)` draws one frame and returns a PNG. A frame is a pure
  function of `t` and checked-in inputs.
- One browser page, one Playwright capture loop, one ffmpeg encode. Do not add a second renderer.
- `--fps 30|60`. `--motion-blur 1-8` averages pure sub-seeks in a half-frame shutter.
- Stills, shot thumbnails, and a contact sheet come first. Then `qc/director_review.json` must
  score each axis at least 8. An AI can draft it. A person signs it.
- Only `deliver` makes a publish package. An agent never signs a human approval.

## Stack

`docs/stack-decision.md` maps the stack menu to this project. The short form is: Canvas 2D,
DOM/SVG, paused GSAP timelines, and one WebGL post pass. Use Three.js only when a shot declares it.
Remotion, p5, Manim, and a video model are not dependencies of the core pipeline.

## Self-check

1. Does the first 2 seconds show a phenomenon or a question?
2. Does each 2 to 4 second window add a new visual or a real change?
3. Can a phone viewer read all text without a pause?
4. Does the last frame loop to the first frame?
5. Does each director score reach 8 or more, with a person's signature?
