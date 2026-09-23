# Competitive Landscape

## Market Structure

| Layer | Representative projects | Primary capability |
|---|---|---|
| Programmatic renderers | Remotion, Motion Canvas, Manim | Code to animation/video |
| Video APIs | Shotstack, Creatomate, JSON2Video | JSON/template to rendered video |
| Agentic workflows | Code2MP4, Clipwright, Vex | Content/brief to scenes/code to video |
| Visual recipe systems | Video Shotcraft and similar libraries | Reusable motion/shot patterns |

## Key Findings

### Rendering is not an opportunity by itself

Mature projects already provide timelines, animation, audio, captions, camera control, compositing, and deterministic rendering.

StoryWeaver should reuse this infrastructure rather than build another renderer.

### Agentic video production is an active area

Recent projects increasingly connect content analysis with scene generation and existing renderers. Therefore, AI generates video code is not a sufficient differentiation.

### Visual recipes are becoming reusable assets

Shot and animation recipes demonstrate that structured motion-design knowledge can be represented and reused.

### Primary hypothesis

A semantic-to-visual layer that explicitly maps content relationships to reusable visual patterns may reduce manual visual planning and improve consistency for structured knowledge videos.

This is not established as a market gap. It is the primary hypothesis to test.

## Reference Projects

- Remotion: https://github.com/remotion-dev/remotion
- Motion Canvas: https://github.com/motion-canvas/motion-canvas
- Manim: https://github.com/3b1b/manim
- HyperFrames: https://github.com/heygen-com/hyperframes
- Code2MP4: https://github.com/code2mp4/code2mp4
- Vex: https://github.com/AKMessi/vex
- Video Shotcraft: https://github.com/Vincentwei1021/video-shotcraft
- anything2explainer: https://github.com/Vincentwei1021/anything2explainer

## Strategic Implication

Do not compete on renderer capability. Validate whether semantic-to-visual representation creates measurable production value above existing renderers and agents.
