#!/usr/bin/env node
// Build a small static docs site for GitHub Pages: README + docs/*.md.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const dest = path.resolve(process.argv[2] || path.join(root, '_site'));

const skip = new Set(['node_modules', '.git', '_site', 'out']);

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const e of entries) {
    if (skip.has(e.name) || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (e.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = href.replace(/"/g, '');
      const local = safe.endsWith('.md') && !/^[a-z]+:/i.test(safe);
      const destHref = local ? safe.replace(/\.md$/i, '.html') : safe;
      return `<a href="${destHref}">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s>（])\*([^*\n]+)\*(?=[\s）<]|$)/g, '$1<em>$2</em>');
}

export function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flushPara();
      const lang = escapeHtml(line.slice(3).trim());
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code class="lang-${lang}">${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      const n = heading[1].length;
      out.push(`<h${n}>${inline(heading[2])}</h${n}>`);
      i++;
      continue;
    }
    if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3}/.test(lines[i + 1])) {
      flushPara();
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      const body = rows.slice(2).map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${rows[0].map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      out.push('<ul>');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      out.push('<ol>');
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push('</ol>');
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${markdownToHtml(buf.join('\n'))}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n');
}

function page(title, body, relRoot) {
  const prefix = relRoot === '.' ? '' : relRoot.endsWith('/') ? relRoot : `${relRoot}/`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; }
body { margin: 0; background: #13232E; color: #F6F1E7; font: 17px/1.65 system-ui, "Noto Sans CJK SC", sans-serif; }
a { color: #E9BE4B; }
header, main, footer { max-width: 880px; margin: auto; padding: 20px 18px; }
header { display: flex; gap: 16px; flex-wrap: wrap; align-items: baseline; border-bottom: 1px solid #2b4452; }
header a { text-decoration: none; }
h1, h2, h3 { line-height: 1.3; }
pre { overflow: auto; background: #0c1820; padding: 12px 14px; border-radius: 8px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #2b4452; padding: 6px 8px; text-align: left; }
blockquote { margin: 0; padding-left: 14px; border-left: 3px solid #E9BE4B; color: #d7d0c4; }
footer { color: #9aa8b0; font-size: 14px; border-top: 1px solid #2b4452; }
</style>
</head>
<body>
<header>
  <a href="${prefix}index.html"><strong>StoryWeaver</strong></a>
  <a href="${prefix}index.html">关于</a>
  <a href="${prefix}docs/index.html">文档</a>
</header>
<main>
${body}
</main>
<footer>GitHub Pages · 仓库文档静态站 · 不含成片托管</footer>
</body>
</html>
`;
}

function titleFrom(md, fallback) {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].trim() : fallback;
}

function relToRoot(outFile) {
  const dir = path.dirname(outFile);
  const rel = path.relative(dir, dest);
  return rel === '' ? '.' : rel.replaceAll('\\', '/');
}

export async function buildPagesSite(outDir = dest) {
  await fs.rm(outDir, {recursive: true, force: true});
  await fs.mkdir(outDir, {recursive: true});

  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');
  await fs.writeFile(path.join(outDir, 'index.html'), page(titleFrom(readme, 'StoryWeaver'), markdownToHtml(readme), '.'));

  const docsRoot = path.join(root, 'docs');
  const docs = (await walk(docsRoot)).sort();
  const listing = ['<h1>文档</h1>', '<ul>'];
  for (const file of docs) {
    const rel = path.relative(docsRoot, file).replaceAll('\\', '/');
    const md = await fs.readFile(file, 'utf8');
    const outRel = rel.replace(/\.md$/i, '.html');
    const outFile = path.join(outDir, 'docs', outRel);
    await fs.mkdir(path.dirname(outFile), {recursive: true});
    await fs.writeFile(outFile, page(titleFrom(md, rel), markdownToHtml(md), relToRoot(outFile)));
    listing.push(`<li><a href="${outRel}">${escapeHtml(titleFrom(md, rel))}</a> <code>${escapeHtml(rel)}</code></li>`);
  }
  listing.push('</ul>');
  await fs.writeFile(path.join(outDir, 'docs', 'index.html'), page('文档', listing.join('\n'), relToRoot(path.join(outDir, 'docs', 'index.html'))));
  return {pages: docs.length + 2, outDir};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {pages, outDir} = await buildPagesSite();
  console.log('PAGES_SITE_READY', pages, outDir);
}
