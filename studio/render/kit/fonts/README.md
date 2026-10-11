# Fonts

Production default: **Noto Sans CJK SC** (Regular / Medium / Bold / Black) from fontconfig. It is the face our published episodes were validated with, and it stays the default. Nothing below changes a render unless a brief opts in.

## What every render does

1. Collect every character the episode puts on screen: `lines.json` (text + speaker), `render/scenes.json` (all scene text), and the HUD in `render/stills.json`.
2. **Missing-glyph check** (`glyphs.py`) against every face the episode uses, the default Noto included. Any needed character without a glyph (rare, traditional, or extension-B characters, emoji) fails `doctor --episode` (`glyph-coverage`, blocks render) and `quality` (`glyph_coverage`).
3. **Per-episode subset** (`subset_fonts.py`, fontTools `pyftsubset`) to exactly those characters, saved as WOFF2 and embedded in the page as `data:` URLs. `render_report.json` records each face's source, sha256, bytes, library id, and license file.

Example sizes: a 376-character Chinese text gives a 115 KB Noto Regular subset and a 58 KB subset of a display face; the 95-character sample fixture gives 27 KB per Noto weight.

## Optional font library (per episode)

A curated OFL font library can be used for display or body text. It lives **outside the repo**; StoryWeaver never vendors font files.

Fetch (any library with the same layout works):

```sh
git clone --depth 1 https://github.com/joeseesun/qiaomu-cover-fonts ~/.cache/storyweaver/fonts/qiaomu-cover-fonts
# or put it anywhere and export SW_FONT_LIBRARY=/path/to/library
```

Layout: `index.json` (`fonts[]` with `id`, `file`, `sha256`, `license`), `fonts/<file>`, `licenses/<id>.txt`. `qiaomu-cover-fonts` ships 34 OFL-1.1 fonts (19 Chinese with 8105-character coverage of the Table of General Standard Chinese Characters, 15 Latin).

Pick per episode in the brief front matter:

```yaml
font_display: smiley   # replaces weights 700/900 (titles, numbers, cards)
font_body: ""          # replaces weights 400/500; blank keeps Noto
```

Rules enforced at resolution time:

- The font must be in `index.json`, present on disk, and match its `sha256`.
- Only OFL licenses are accepted.
- **Reserved Font Names.** A subset is a modified font, and OFL forbids a modified font from using a reserved name. When the license header reserves a name that appears in the font's own name (for example Douyin Sans), the face is embedded whole and unmodified. Names reserved for another family (Noto's `Source`) do not block subsetting.
- The glyph check runs on the chosen face. Display fonts often cover less than Noto; a missing character fails before rendering. Change the font or the text.

License notes: the OFL text and copyright for each font stay in the library's `licenses/` folder; `render_report.json` points to that file for every embedded library face. Fonts embedded in a video or document are not themselves subject to OFL redistribution terms, but keep the report with the episode.

`doctor` reports `woff2-tools` (fontTools + brotli, required) and `font-library` (optional; shows the fetch command when absent).
