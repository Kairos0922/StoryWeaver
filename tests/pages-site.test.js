import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPagesSite, markdownToHtml} from '../scripts/build-pages-site.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('markdown converter keeps headings, links and tables', () => {
  const html = markdownToHtml('# 标题\n\n见 [pipeline](docs/studio/pipeline.md)。\n\n| 文件 | 内容 |\n|---|---|\n| a | b |\n');
  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /href="docs\/studio\/pipeline.html"/);
  assert.match(html, /<th>文件<\/th>/);
});

test('pages site builds README and docs without Vercel', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-pages-'));
  try {
    const {pages} = await buildPagesSite(tmp);
    const index = await fs.readFile(path.join(tmp, 'index.html'), 'utf8');
    const docsIndex = await fs.readFile(path.join(tmp, 'docs/index.html'), 'utf8');
    const pipeline = await fs.readFile(path.join(tmp, 'docs/studio/pipeline.html'), 'utf8');
    assert.ok(pages >= 10);
    assert.match(index, /闸门制知识短片工作室/);
    assert.doesNotMatch(index, /vercel/i);
    assert.match(docsIndex, /pipeline\.html/);
    assert.match(pipeline, /闸/);
    const vercelJson = await fs.access(path.join(root, 'vercel.json')).then(() => true, () => false);
    assert.equal(vercelJson, false);
  } finally {
    await fs.rm(tmp, {recursive: true, force: true});
  }
});
