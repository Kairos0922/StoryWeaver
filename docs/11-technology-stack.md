# Technology Stack

## Locked V1

| Layer | Technology | Status |
|---|---|---|
| Runtime | Node.js 24 LTS | Use |
| Language | JavaScript ESM | Use |
| Contract | JSON Schema + Ajv | Use |
| Video IR | renderer-neutral VideoSpec | Use |
| Primary 2D scene format | SVG | Use |
| SVG rasterization | resvg-js / Rust resvg | Use |
| Image utilities | Sharp | Use when needed |
| Video/audio | FFmpeg | Use |
| Expressive 2D | Motion Canvas | Future adapter |
| Generative art | p5.js | Future adapter |
| GPU 2D | PixiJS | Future adapter |
| Agent video framework | Remotion | Not a core dependency |

## Decisions

### Node 24 + JavaScript ESM
Node 24 is the current LTS line. Production applications should use an LTS release. JavaScript ESM keeps model-generated implementation code simple while VideoSpec remains JSON.

### SVG + resvg
SVG remains the default because exact typography, diagrams, charts, geometry and inspectable structure are central to our target content. The raster boundary is SVG -> resvg -> PNG. resvg is a Rust SVG renderer with extensive regression tests and an explicit reproducibility goal.

Sharp remains available for asset/image processing, not as the primary SVG renderer.

### FFmpeg
FFmpeg remains the final media boundary for video encoding, audio muxing and later filtergraph-based post-processing.

### p5.js
p5.js is excellent for creative coding, animation, audio and WebGL, but those capabilities are a secondary StoryWeaver scenario. It therefore stays behind a renderer adapter rather than becoming the core.

### Motion Canvas
Motion Canvas is purpose-built for programmatic 2D animation and voice-over synchronization, supports JavaScript or TypeScript, and exports image sequences or FFmpeg video. It is the first candidate for an expressive-animation adapter when production tasks demonstrate that SVG is insufficient.

### PixiJS
PixiJS provides GPU-accelerated WebGL/WebGL2 rendering. It is reserved for scenes where SVG cannot meet complexity/performance requirements.

### Remotion
Remotion is strong for programmatic and agentic video, but it makes React/browser rendering the center of gravity and is source-available rather than OSI open source. Its current license has specific automation terms. We therefore do not make it a core dependency.

## Architecture boundary

Content -> Story -> Visual Strategy -> VideoSpec -> Renderer API -> Frame -> FFmpeg -> MP4

VideoSpec must never contain renderer-specific fields. Renderer adapters consume the same VideoSpec without changing its semantics.

## Rules

1. Default renderer is SVG.
2. No browser is required for the default production path.
3. Rendering is deterministic for the same spec, assets and renderer version.
4. New rendering technology enters only after a measurable production benefit.
5. p5.js, Motion Canvas, PixiJS and Remotion are not allowed to leak into VideoSpec.
