// Render-contract lint. The rules are written out in docs/render-contract.md.
// Capture-path code must be a pure function of t; dependencies must be pinned to exact versions.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));

// Code that runs inside the capture page or computes a frame.
export const CAPTURE_PATHS = [
  'studio/render/browser/dom',
  'studio/render/browser/compositor.js',
  'studio/render/browser/post.js',
  'studio/render/browser/three_layer.js',
  'studio/render/kit/canvas/kit.js',
  'studio/render/kit/canvas/timeline.js',
  'studio/motion/tokens.js',
];

export const RULES = [
  {id: 'no-date', re: /\bDate\.now\s*\(|\bnew\s+Date\s*\(|\bperformance\.now\s*\(/, why: 'wall clock in capture path'},
  {id: 'no-raf', re: /\brequestAnimationFrame\s*\(/, why: 'browser frame callback in capture path'},
  {id: 'no-timers', re: /\bset(Timeout|Interval|Immediate)\s*\(/, why: 'timer in capture path'},
  {id: 'no-unseeded-random', re: /\bMath\.random\s*\(/, why: 'unseeded randomness; use a seeded PRNG'},
  {id: 'no-network', re: /\bfetch\s*\(\s*['"`]https?:|\bimport\s*\(?\s*['"`]https?:|\bXMLHttpRequest\b/, why: 'network request in capture path'},
  {id: 'no-css-motion', re: /@keyframes|['"`][^'"`]*\b(transition|animation)\s*:\s*[^'"`;]*\d/, why: 'CSS animation or transition'},
];

export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    // Regex literals that only describe banned names (validators) are not calls.
    .replace(/\/(?![*/])(?:\\.|\[[^\]]*\]|[^/\n\\])+\/[gimsuy]*(?=\s*\.test\b)/g, '/re/');
}

export function lintSource(src, file = '<source>') {
  const findings = [];
  const lines = stripComments(src).split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) if (rule.re.test(line)) findings.push({file, line: i + 1, rule: rule.id, why: rule.why});
  });
  return findings;
}

export function lintPins(pkg) {
  const findings = [];
  for (const field of ['dependencies', 'devDependencies']) {
    for (const [name, spec] of Object.entries(pkg[field] || {})) {
      if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(spec)) findings.push({file: 'package.json', rule: 'pinned-versions', why: `${name}@${spec} is not an exact version`});
    }
  }
  return findings;
}

async function collect(rel, start) {
  const abs = path.join(start, rel);
  const stat = await fs.stat(abs);
  if (stat.isFile()) return [rel];
  const out = [];
  for (const entry of await fs.readdir(abs, {withFileTypes: true})) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...(await collect(child, start)));
    else if (/\.(m?js|jsx|css|html)$/.test(entry.name) && !/^bundle\./.test(entry.name)) out.push(child);
  }
  return out;
}

export async function lintRenderContract(start = root) {
  const findings = [];
  for (const rel of CAPTURE_PATHS) {
    for (const file of await collect(rel, start)) {
      findings.push(...lintSource(await fs.readFile(path.join(start, file), 'utf8'), file));
    }
  }
  findings.push(...lintPins(JSON.parse(await fs.readFile(path.join(start, 'package.json'), 'utf8'))));
  return {ok: findings.length === 0, findings};
}

export function formatRenderContract(report) {
  if (report.ok) return 'RENDER_CONTRACT_OK';
  return ['RENDER_CONTRACT_FAIL', ...report.findings.map(f => `${f.file}${f.line ? `:${f.line}` : ''} [${f.rule}] ${f.why}`)].join('\n');
}
