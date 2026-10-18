// A small checker for the mechanical parts of ASD-STE100. It cannot replace the official
// dictionary or a human check. It catches the common regressions: long sentences, passive
// voice, gerunds, modals, contractions, semicolons, and Latin abbreviations.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const DOCS = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'skills/produce-video/SKILL.md',
  'skills/produce-video/references/prompt-framework.md',
  ...['adapters.md', 'director-review.md', 'environment.md', 'fact-check.md', 'lessons.md', 'methodology.md', 'motion-tokens.md', 'quality-standard.md', 'render-contract.md', 'series-workflow.md', 'stack-decision.md', 'style-lock.md', 'techniques.md', 'visual-rhythm.md', 'workflow.md', 'ste100.md'].map(f => `docs/${f}`),
];

const ALLOWED_ING = new Set([
  'rendering', 'encoding', 'decoding', 'streaming', 'logging', 'testing', 'building', 'packaging',
  'processing', 'timing', 'heading', 'string', 'ring', 'thing', 'during', 'opening', 'closing',
  'warning', 'meaning', 'ceiling', 'painting', 'drawing', 'mixing', 'capturing', 'playing',
  'binding', 'easing', 'coding', 'reading', 'spring', 'nothing', 'missing', 'licensing', 'resting', 'passing',
]);
const PASSIVE = /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ed|done|made|used|set|kept|shown|written|read|built|sent|found|given|taken|known|seen)\b/i;
const MODAL = /\b(?:should|may|might|could|would)\b/i;
const CONTRACTION = /\b(?:can't|won't|don't|doesn't|isn't|aren't|wasn't|weren't|it's|that's|we're|you're|they're|I'm|I've|we've|they've|I'll|we'll|they'll)\b/i;
const LATIN = /\b(?:e\.g\.|i\.e\.|etc\.)/i;

function proseLines(text) {
  const out = [];
  let fenced = false;
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*```/.test(raw)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (/^\s*\|/.test(raw)) continue;
    if (/^\s*#/.test(raw)) continue;
    let line = raw
      .replace(/`[^`]*`/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) continue;
    out.push(line);
  }
  return out;
}

function sentences(line) {
  return line.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function words(sentence) {
  return (sentence.match(/[A-Za-z0-9][A-Za-z0-9'_-]*/g) || []);
}

export function checkText(file, text) {
  const findings = [];
  for (const line of proseLines(text)) {
    for (const sentence of sentences(line)) {
      const count = words(sentence).length;
      if (count > 25) findings.push({file, rule: 'sentence-long', detail: `${count} words: ${sentence.slice(0, 90)}`});
      if (PASSIVE.test(sentence)) findings.push({file, rule: 'passive', detail: sentence.slice(0, 90)});
      if (MODAL.test(sentence)) findings.push({file, rule: 'modal', detail: sentence.slice(0, 90)});
      if (CONTRACTION.test(sentence)) findings.push({file, rule: 'contraction', detail: sentence.slice(0, 90)});
      if (LATIN.test(sentence)) findings.push({file, rule: 'latin', detail: sentence.slice(0, 90)});
      if (sentence.includes(';')) findings.push({file, rule: 'semicolon', detail: sentence.slice(0, 90)});
      for (const word of words(sentence)) {
        const lower = word.toLowerCase();
        if (lower.endsWith('ing') && !ALLOWED_ING.has(lower) && lower.length > 4) {
          findings.push({file, rule: 'gerund', detail: `${lower}: ${sentence.slice(0, 80)}`});
          break;
        }
      }
    }
  }
  return findings;
}

export async function checkDocs(start = root) {
  const findings = [];
  for (const rel of DOCS) {
    let text;
    try {
      text = await fs.readFile(path.join(start, rel), 'utf8');
    } catch {
      findings.push({file: rel, rule: 'missing', detail: 'file not found'});
      continue;
    }
    findings.push(...checkText(rel, text));
  }
  return {ok: findings.length === 0, files: DOCS.length, findings};
}

export function formatSte100(report) {
  if (report.ok) return `STE100_OK ${report.files} files`;
  const lines = [`STE100_FAILED ${report.findings.length} findings`];
  for (const f of report.findings.slice(0, 80)) lines.push(`- ${f.file}: ${f.rule}: ${f.detail}`);
  if (report.findings.length > 80) lines.push(`... ${report.findings.length - 80} more`);
  return lines.join('\n');
}
