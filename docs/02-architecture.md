# System Architecture

```text
Source Content → Semantic Model → Visual Strategy → VideoSpec
                                      ↓
                              validate / compile
                                      ↓
                           Programmatic Renderer
                           ├─ SVG primitives
                           ├─ deterministic timing
                           ├─ captions
                           └─ audio mux
                                      ↓
                                    MP4
```

The renderer does not decide what a concept means. The planning layer does not render pixels. The only model-facing boundary is the validated `VideoSpec`.

High-cost model calls are reserved for semantic extraction, visual strategy, hard repair and final review. Routine edits should use structured transforms or lower-cost models.
