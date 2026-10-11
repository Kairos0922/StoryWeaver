import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {briefFonts, reservedNames, resolveEpisodeFonts, resolveLibraryFont} from '../studio/render/kit/fonts/library.mjs';
import {embedFonts, episodeGlyphCheck} from '../studio/render/kit/canvas/runtime.mjs';
import {runDoctor} from '../studio/doctor.mjs';

const fixture = fileURLToPath(new URL('./fixtures/sample-series/ep01', import.meta.url));

// A fictional two-font library built on the fly: "Pebble Round" (OFL, no reserved name in its
// own name) and "Lantern Sans" whose license reserves "Lantern" (must stay whole).
const BUILD = `
import sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
def build(path, family, chars, flavor):
    names = ['.notdef'] + ['g%04x' % ord(c) for c in chars]
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap({ord(c): 'g%04x' % ord(c) for c in chars})
    glyphs = {}
    for n in names:
        p = TTGlyphPen(None); p.moveTo((100, 0)); p.lineTo((100, 700)); p.lineTo((600, 700)); p.lineTo((600, 0)); p.closePath()
        glyphs[n] = p.glyph()
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics({n: (700, 100) for n in names})
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({'familyName': family, 'styleName': 'Regular'})
    fb.setupOS2(); fb.setupPost()
    fb.font.flavor = flavor
    fb.save(path)
chars = ''.join(chr(c) for c in range(0x21, 0x7f)) + '小石子等一下'
build(sys.argv[1], 'Pebble Round', chars, 'woff2')
build(sys.argv[2], 'Lantern Sans', chars, None)
`;

const sha = async f => crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');

let lib;
async function library() {
  lib ||= (async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-fontlib-'));
    await fs.mkdir(path.join(dir, 'fonts'));
    await fs.mkdir(path.join(dir, 'licenses'));
    const a = path.join(dir, 'fonts', 'pebble.woff2');
    const b = path.join(dir, 'fonts', 'lantern.ttf');
    const r = spawnSync('python3', ['-c', BUILD, a, b], {encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);
    await fs.writeFile(path.join(dir, 'licenses', 'pebble.txt'), 'Copyright 2026 Fixture Foundry.\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\n');
    await fs.writeFile(path.join(dir, 'licenses', 'lantern.txt'), 'Copyright 2026 Fixture Foundry,\nwith Reserved Font Names "Lantern", "灯笼".\n\nSIL OPEN FONT LICENSE Version 1.1\n');
    await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify({version: 'fixture', fonts: [
      {id: 'pebble', en: 'Pebble Round', file: 'pebble.woff2', sha256: await sha(a), license: 'OFL-1.1', cjk: true},
      {id: 'lantern', en: 'Lantern Sans', file: 'lantern.ttf', sha256: await sha(b), license: 'OFL-1.1', cjk: true},
      {id: 'closed', en: 'Closed', file: 'pebble.woff2', license: 'Proprietary'},
      {id: 'tampered', en: 'Tampered', file: 'pebble.woff2', sha256: '0'.repeat(64), license: 'OFL-1.1'},
    ]}));
    return dir;
  })();
  return lib;
}

async function episode(frontMatter = '', sceneText = '') {
  const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'sw-fonts-')), 'ep01');
  await fs.cp(fixture, dir, {recursive: true});
  if (frontMatter) {
    const brief = path.join(dir, 'brief.md');
    await fs.writeFile(brief, (await fs.readFile(brief, 'utf8')).replace(/^language: en$/m, `language: en\n${frontMatter}`));
  }
  if (sceneText) {
    const file = path.join(dir, 'render', 'scenes.json');
    const doc = JSON.parse(await fs.readFile(file, 'utf8'));
    doc.font_probe = sceneText;
    await fs.writeFile(file, JSON.stringify(doc));
  }
  return dir;
}

test('reserved font names are read from the OFL header', () => {
  assert.deepEqual(reservedNames('Copyright x\nwith Reserved Font Names "Douyin", "抖音",  "抖音美好".\nSIL OPEN FONT LICENSE'), ['Douyin', '抖音', '抖音美好']);
  assert.deepEqual(reservedNames("(c) Adobe, with Reserved Font Name 'Source'.\n-----"), ['Source']);
  assert.deepEqual(reservedNames('Copyright 2026 nobody.'), []);
});

test('brief picks optional fonts; blank keeps the Noto default', () => {
  assert.deepEqual(briefFonts('---\nfont_display: pebble\nfont_body: ""\n---\n'), {font_display: 'pebble'});
  assert.deepEqual(briefFonts('---\nstatus: draft\n---\n'), {});
});

test('library resolution verifies presence, OFL license, and sha256', async () => {
  const dir = await library();
  const pebble = await resolveLibraryFont('pebble', {dir});
  assert.equal(pebble.whole, false);
  assert.match(pebble.license_file, /licenses\/pebble\.txt$/);
  const lantern = await resolveLibraryFont('lantern', {dir});
  assert.equal(lantern.whole, true, 'reserved name in the font name: no subsetting');
  await assert.rejects(resolveLibraryFont('closed', {dir}), {code: 'FONT_LICENSE'});
  await assert.rejects(resolveLibraryFont('tampered', {dir}), {code: 'FONT_SHA_MISMATCH'});
  await assert.rejects(resolveLibraryFont('nope', {dir}), {code: 'FONT_UNKNOWN'});
  await assert.rejects(resolveLibraryFont('pebble', {dir: path.join(dir, 'absent')}), err => err.code === 'FONT_LIBRARY_MISSING' && /git clone/.test(err.message));
});

test('episode subset embeds a library face as WOFF2 next to Noto', async () => {
  const dir = await library();
  const ep = await episode('font_display: pebble');
  const {overrides} = await resolveEpisodeFonts(ep, {dir});
  assert.deepEqual(Object.keys(overrides).map(Number), [700, 900]);
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-sub-'));
  const {css, report} = await embedFonts('小石子AB', out, overrides);
  const bold = report.fonts.find(f => f.weight === 700);
  assert.equal(bold.library_id, 'pebble');
  assert.equal(bold.format, 'woff2');
  assert.equal(bold.subset, true);
  assert.ok(bold.bytes < 4000, `subset should be tiny, got ${bold.bytes}`);
  assert.equal(report.fonts.find(f => f.weight === 400).library_id, undefined, 'body stays Noto');
  assert.match(css, /data:font\/woff2;base64/);
  const whole = await embedFonts('小石', await fs.mkdtemp(path.join(os.tmpdir(), 'sw-sub-')), {700: await resolveLibraryFont('lantern', {dir})});
  const w = whole.report.fonts.find(f => f.weight === 700);
  assert.equal(w.subset, false);
  assert.equal(w.sha256, w.source_sha256, 'reserved-name font is embedded unmodified');
  await assert.rejects(embedFonts('小石灯', await fs.mkdtemp(path.join(os.tmpdir(), 'sw-sub-')), overrides), /Missing glyphs: 700: 灯; 900: 灯/);
});

test('glyph check catches characters no face can draw, Noto included', async () => {
  const dir = await library();
  const ok = await episodeGlyphCheck(await episode('font_display: pebble'), {dir});
  assert.equal(ok.ok, false, 'fixture lines use characters the fictional font lacks');
  const plain = await episodeGlyphCheck(await episode());
  assert.equal(plain.ok, true, plain.detail);
  const rare = await episodeGlyphCheck(await episode('', '𠀀'));
  assert.equal(rare.ok, false);
  assert.match(rare.detail, /400: 𠀀/);
  const doctor = await runDoctor({episodeDir: await episode('', '𠀀'), forRender: true});
  assert.equal(doctor.checks.find(c => c.id === 'glyph-coverage').ok, false);
  assert.equal(doctor.render_ok, false);
  const missingLib = await episodeGlyphCheck(await episode('font_body: pebble'), {dir: path.join(dir, 'absent')});
  assert.equal(missingLib.ok, false);
  assert.match(missingLib.detail, /git clone/);
});
