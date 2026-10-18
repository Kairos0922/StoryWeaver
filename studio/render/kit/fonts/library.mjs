// Optional font library: fonts that live OUTSIDE the repo and are picked per episode in brief.md.
// Production default stays Noto Sans CJK SC via fontconfig; nothing here changes that unless a
// brief names a library font.
//
// Library layout (qiaomu-cover-fonts compatible, https://github.com/joeseesun/qiaomu-cover-fonts):
//   <dir>/index.json         {"fonts": [{"id", "en", "file", "sha256", "license", ...}]}
//   <dir>/fonts/<file>
//   <dir>/licenses/<id>.txt  OFL text with copyright and Reserved Font Names
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseFrontMatter} from '../../../brief.mjs';

export const DEFAULT_LIBRARY_DIR = path.join(os.homedir(), '.cache', 'knowledge-video-studio', 'fonts', 'qiaomu-cover-fonts');
export const LIBRARY_REPO = 'https://github.com/joeseesun/qiaomu-cover-fonts';
export const FETCH_HINT = `git clone --depth 1 ${LIBRARY_REPO} ${DEFAULT_LIBRARY_DIR}  (or set SW_FONT_LIBRARY=/path)`;

// Brief front-matter keys -> the CSS weights they replace. Body text uses 400/500, titles 700/900.
export const BRIEF_FONT_ROLES = Object.freeze({font_body: [400, 500], font_display: [700, 900]});

export function libraryDir(env = process.env) {
  return env.SW_FONT_LIBRARY || DEFAULT_LIBRARY_DIR;
}

export async function loadLibrary(dir = libraryDir()) {
  let index;
  try {
    index = JSON.parse(await fs.readFile(path.join(dir, 'index.json'), 'utf8'));
  } catch {
    return null;
  }
  return {dir, fonts: new Map((index.fonts || []).map(f => [f.id, f])), version: index.version || ''};
}

// Reserved Font Names from the license header. OFL forbids a modified font (a subset is modified)
// from using a reserved name, so such fonts are embedded whole and unmodified.
export function reservedNames(licenseText) {
  const head = String(licenseText).split(/-{5,}|SIL OPEN FONT LICENSE/i)[0];
  const names = [];
  for (const m of head.matchAll(/Reserved Font Names?\s+((?:["'“‘][^"'”’]+["'”’][,\s]*(?:and\s+)?)+)/gi)) {
    for (const n of m[1].matchAll(/["'“‘]([^"'”’]+)["'”’]/g)) names.push(n[1].trim());
  }
  return names;
}

export function mustStayWhole(entry, rfn) {
  const label = `${entry.en || ''} ${entry.family || ''} ${entry.file || ''}`.toLowerCase();
  return rfn.some(n => label.includes(n.toLowerCase()));
}

async function sha256(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

// Resolve one library font id to a verified file. Throws with a fetch hint when unavailable.
export async function resolveLibraryFont(id, {dir = libraryDir(), verify = true} = {}) {
  const lib = await loadLibrary(dir);
  if (!lib) throw Object.assign(new Error(`font library not found at ${dir}. Fetch it: ${FETCH_HINT}`), {code: 'FONT_LIBRARY_MISSING'});
  const entry = lib.fonts.get(id);
  if (!entry) throw Object.assign(new Error(`font "${id}" is not in ${dir}/index.json`), {code: 'FONT_UNKNOWN'});
  if (entry.license && !/^OFL/i.test(entry.license)) throw Object.assign(new Error(`font "${id}" license ${entry.license} is not OFL; not allowed for embedding`), {code: 'FONT_LICENSE'});
  const file = path.join(dir, 'fonts', entry.file);
  try {
    await fs.access(file);
  } catch {
    throw Object.assign(new Error(`font file missing: ${file}. Re-fetch: ${FETCH_HINT}`), {code: 'FONT_FILE_MISSING'});
  }
  if (verify && entry.sha256 && (await sha256(file)) !== entry.sha256) {
    throw Object.assign(new Error(`font "${id}" sha256 mismatch: ${file}`), {code: 'FONT_SHA_MISMATCH'});
  }
  let license = '';
  const licenseFile = path.join(dir, 'licenses', `${id}.txt`);
  try {
    license = await fs.readFile(licenseFile, 'utf8');
  } catch {}
  const rfn = reservedNames(license);
  return {
    id,
    file,
    sha256: entry.sha256 || '',
    license: entry.license || 'OFL-1.1',
    license_file: license ? licenseFile : '',
    copyright: license.split('\n').find(l => /copyright|\(c\)|©/i.test(l))?.trim() || '',
    reserved_names: rfn,
    whole: mustStayWhole(entry, rfn),
  };
}

// The brief's font choices: {font_body?: id, font_display?: id}. Blank means the Noto default.
export function briefFonts(briefMarkdown) {
  const {data} = parseFrontMatter(briefMarkdown || '');
  const out = {};
  for (const key of Object.keys(BRIEF_FONT_ROLES)) {
    const v = String(data[key] ?? '').trim();
    if (v) out[key] = v;
  }
  return out;
}

// weight -> resolved library font, for every weight a brief overrides.
export async function resolveEpisodeFonts(episodeDir, opts = {}) {
  let brief = '';
  try {
    brief = await fs.readFile(path.join(episodeDir, 'brief.md'), 'utf8');
  } catch {}
  const choice = briefFonts(brief);
  const overrides = {};
  for (const [key, id] of Object.entries(choice)) {
    const font = await resolveLibraryFont(id, opts);
    for (const w of BRIEF_FONT_ROLES[key]) overrides[w] = {...font, role: key};
  }
  return {choice, overrides};
}
