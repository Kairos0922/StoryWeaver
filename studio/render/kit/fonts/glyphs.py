#!/usr/bin/env python3
"""Check that every needed character has a glyph in each font face. Subsets nothing.

    python3 studio/render/kit/fonts/glyphs.py --text-file chars.txt --face 400=/path/a.ttc:0 --face 700=/path/b.woff2

Prints {"chars": N, "faces": [...], "missing": {"400": "…"}}. Exit 1 when anything is missing.
Works for any font, the default Noto included, so rare or traditional characters are caught
before a render instead of showing up as tofu.
"""
import argparse
import json
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print(json.dumps({'error': 'fonttools missing: pip install fonttools'}))
    sys.exit(2)


def parse_face(spec):
    weight, _, rest = spec.partition('=')
    path, index = rest, 0
    if ':' in rest and rest.rsplit(':', 1)[1].isdigit():
        path, idx = rest.rsplit(':', 1)
        index = int(idx)
    return weight, path, index


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text-file', required=True)
    ap.add_argument('--face', action='append', required=True, help='WEIGHT=PATH[:INDEX]')
    args = ap.parse_args()
    need = sorted({ch for ch in Path(args.text_file).read_text(encoding='utf8') if not ch.isspace()})
    report = {'chars': len(need), 'faces': [], 'missing': {}}
    for spec in args.face:
        weight, path, index = parse_face(spec)
        cmap = TTFont(path, fontNumber=index, lazy=True).getBestCmap() or {}
        missing = ''.join(ch for ch in need if ord(ch) not in cmap)
        report['faces'].append({'weight': weight, 'source': path, 'source_index': index})
        if missing:
            report['missing'][weight] = missing
    print(json.dumps(report, ensure_ascii=False))
    sys.exit(1 if report['missing'] else 0)


if __name__ == '__main__':
    main()
