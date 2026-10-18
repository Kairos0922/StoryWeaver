# Motion tokens

Use a token by name. Do not write a number in a scene. The tokens live in
`studio/motion/tokens.js`.

| Token group | Use |
|---|---|
| `ease.*` | Named easing curves |
| `dur.*` | Named durations |
| `spring(t, zeta, freq)` | Closed-form spring |
| `beatFrame(...)` | A frame on a beat |
| `cueFrames(...)` | Frames for a cue |

## Rules

- A spring uses the closed form. Do not simulate a spring frame by frame.
- A beat frame comes from a time and a rounded beat. Do not add rounded values.
- Animate `transform` and `opacity` only.
- Put resting text on whole pixels.
- Do not use an inline easing curve or duration.
- A scene uses the token name. A reviewer can read the name and know the motion.

## Add a token

1. Describe the motion in one sentence.
2. Add the value to `studio/motion/tokens.js`.
3. Add a test or a review note.
4. Update this table.
