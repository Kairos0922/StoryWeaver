#!/usr/bin/env python3
"""Extract and subset the CJK font faces a render embeds, and prove glyph coverage.

    python3 studio/render/kit/fonts/subset_fonts.py --text-file chars.txt --out-dir DIR

Writes one WOFF2 file per weight into DIR (built with fontTools `pyftsubset`) and prints a JSON
report. Exit 1 when any character in the text file has no glyph (the render must not ship tofu).

`--face 700=/lib/fonts/smiley.woff2` replaces one weight with an optional library font picked in
the brief. `--whole 700` embeds that face unmodified (OFL Reserved Font Name: no subsetting).

Sources are located with fontconfig (`fc-match "Noto Sans CJK SC:style=..."`). On a box
without fontconfig, point SW_FONT_400 / SW_FONT_500 / SW_FONT_700 / SW_FONT_900 at
font files and SW_FONT_<w>_INDEX at the collection index.

Requires: fonttools + brotli (apt: python3-fonttools python3-brotli)
"""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

try:
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


def parse_face(spec):
    weight, _, rest = spec.partition('=')
    path, index = rest, 0
    if ':' in rest and rest.rsplit(':', 1)[1].isdigit():
        path, idx = rest.rsplit(':', 1)
        index = int(idx)
    return int(weight), path, index


def pyftsubset(src, index, text_file, dest):
    exe = shutil.which('pyftsubset')
    cmd = [exe] if exe else [sys.executable, '-m', 'fontTools.subset']
    cmd += [src, f'--text-file={text_file}', f'--output-file={dest}', '--flavor=woff2',
            f'--font-number={index}', '--layout-features=*', '--name-IDs=*', '--name-languages=*',
            '--notdef-outline', '--no-hinting', '--desubroutinize']
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f'pyftsubset failed for {src}: {r.stderr[-800:]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text-file', required=True)
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--family', default='Noto Sans CJK SC')
    ap.add_argument('--weights', default='400,700,900')
    ap.add_argument('--face', action='append', default=[], help='WEIGHT=PATH[:INDEX] override')
    ap.add_argument('--whole', action='append', default=[], help='WEIGHT to embed unmodified')
    args = ap.parse_args()
    try:
        import brotli  # noqa: F401  (woff2 needs it)
    except ImportError:
        print(json.dumps({'error': 'brotli missing (WOFF2): apt install python3-brotli or pip install brotli'}))
        sys.exit(2)

    text = Path(args.text_file).read_text(encoding='utf8')
    need = sorted({ch for ch in text if not ch.isspace()})
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    clean = out_dir / 'subset-chars.txt'
    clean.write_text(''.join(need), encoding='utf8')
    faces = {w: (p, i) for w, p, i in map(parse_face, args.face)}
    whole = {int(w) for w in args.whole}
    report = {'family': args.family, 'chars': len(need), 'fonts': [], 'missing': {}}
    for w in [int(x) for x in args.weights.split(',')]:
        src, index = faces.get(w) or locate(args.family, w)
        cmap = TTFont(src, fontNumber=index, lazy=True).getBestCmap() or {}
        missing = [ch for ch in need if ord(ch) not in cmap]
        if w in whole:
            ext = Path(src).suffix.lower()
            dest = out_dir / f'sw-cjk-{w}{ext}'
            shutil.copyfile(src, dest)
            fmt = {'.woff2': 'woff2', '.woff': 'woff', '.otf': 'opentype'}.get(ext, 'truetype')
        else:
            dest = out_dir / f'sw-cjk-{w}.woff2'
            pyftsubset(src, index, clean, dest)
            fmt = 'woff2'
        report['fonts'].append({
            'weight': w,
            'source': src,
            'source_index': index,
            'source_sha256': sha256(src),
            'file': str(dest),
            'format': fmt,
            'subset': w not in whole,
            'sha256': sha256(dest),
            'bytes': dest.stat().st_size,
            'glyphs': len(TTFont(dest, lazy=True).getGlyphOrder()),
        })
        if missing:
            report['missing'][str(w)] = ''.join(missing)
    print(json.dumps(report, ensure_ascii=False))
    sys.exit(1 if report['missing'] else 0)


if __name__ == '__main__':
    main()
