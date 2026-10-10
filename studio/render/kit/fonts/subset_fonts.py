#!/usr/bin/env python3
"""Extract and subset the CJK font faces a render embeds, and prove glyph coverage.

    python3 studio/render/kit/fonts/subset_fonts.py --text-file chars.txt --out-dir DIR

Writes one OpenType file per weight into DIR and prints a JSON report. Exit 1 when any
character in the text file has no glyph in the subset (the render must not ship tofu).

Sources are located with fontconfig (`fc-match "Noto Sans CJK SC:style=..."`). On a box
without fontconfig, point SW_FONT_400 / SW_FONT_500 / SW_FONT_700 / SW_FONT_900 at
font files and SW_FONT_<w>_INDEX at the collection index.

Requires: pip install fonttools
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

try:
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont
except ImportError:
    print(json.dumps({'error': 'fonttools missing: pip install fonttools'}))
    sys.exit(2)

STYLES = {400: 'Regular', 500: 'Medium', 700: 'Bold', 900: 'Black'}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def locate(family, weight):
    env = os.environ.get(f'SW_FONT_{weight}')
    if env:
        return env, int(os.environ.get(f'SW_FONT_{weight}_INDEX', '0'))
    pattern = f'{family}:style={STYLES[weight]}'
    out = subprocess.run(['fc-match', '-f', '%{file}\n%{index}\n%{family}\n%{style}', pattern],
                         capture_output=True, text=True, check=True).stdout.split('\n')
    file, index, fams, style = out[0], int(out[1] or 0), out[2], out[3]
    if family not in fams.split(','):
        raise SystemExit(f'fontconfig has no "{family}" (got {fams}); install fonts-noto-cjk fonts-noto-cjk-extra or set SW_FONT_{weight}')
    if STYLES[weight] not in style:
        raise SystemExit(f'fontconfig has no {family} {STYLES[weight]} (got {style}); install fonts-noto-cjk-extra or set SW_FONT_{weight}')
    return file, index


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text-file', required=True)
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--family', default='Noto Sans CJK SC')
    ap.add_argument('--weights', default='400,700,900')
    args = ap.parse_args()

    text = Path(args.text_file).read_text(encoding='utf8')
    need = sorted({ch for ch in text if not ch.isspace()})
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {'family': args.family, 'chars': len(need), 'fonts': [], 'missing': {}}
    for w in [int(x) for x in args.weights.split(',')]:
        src, index = locate(args.family, w)
        font = TTFont(src, fontNumber=index, lazy=False)
        opts = Options()
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        sub = Subsetter(opts)
        sub.populate(text=''.join(need))
        sub.subset(font)
        cmap = font.getBestCmap() or {}
        missing = [ch for ch in need if ord(ch) not in cmap]
        dest = out_dir / f'sw-cjk-{w}.otf'
        font.save(dest)
        report['fonts'].append({
            'weight': w,
            'source': src,
            'source_index': index,
            'source_sha256': sha256(src),
            'file': str(dest),
            'sha256': sha256(dest),
            'bytes': dest.stat().st_size,
            'glyphs': len(font.getGlyphOrder()),
        })
        if missing:
            report['missing'][str(w)] = ''.join(missing)
    print(json.dumps(report, ensure_ascii=False))
    sys.exit(1 if report['missing'] else 0)


if __name__ == '__main__':
    main()
