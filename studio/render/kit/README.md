# Shared picture kit

`manifest.json` is the component contract, not a renderer.

An episode `render/` folder may only name components and the beats they appear on. Do not copy a full `index.html` to the next episode.

Adapters draw the same timeline. The visual clock is 2.5 seconds. More than 5 seconds without a new visual fails `beat_clock`. Every beat needs a character action. A character standing beside a chart fails QC.

Voice pace is a separate clock. Do not “fix” a dense voice-over by adding more cuts.
