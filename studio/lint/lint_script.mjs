import fs from 'node:fs/promises';
import path from 'node:path';

const defaultRulesUrl = new URL('./rules.json', import.meta.url);

export async function loadRules(rulesPath = defaultRulesUrl) {
  return JSON.parse(await fs.readFile(rulesPath, 'utf8'));
}

function compile(pattern) {
  return new RegExp(pattern, 'u');
}

export function stripSelfCheck(markdown) {
  return markdown.replace(/^#{1,6}\s+自查[\s\S]*$/m, '');
}

export function stripSpeaker(text, speakers) {
  const match = text.match(/^([^：:]{1,12})[：:]\s*(.*)$/u);
  if (!match) return {speaker: '', text};
  if (speakers.includes(match[1])) return {speaker: match[1], text: match[2]};
  return {speaker: '', text};
}

export function extractSpokenLines(markdown, speakers) {
  const lines = stripSelfCheck(markdown).split(/\r?\n/);
  const spoken = [];
  let inFence = false;
  let heading = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      heading = headingMatch[1].trim();
      continue;
    }
    const bold = line.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      heading = bold[1].replace(/[【】]/g, '').trim();
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (!quote) continue;
    const raw = quote[1].trim();
    if (!raw) continue;
    const stripped = stripSpeaker(raw, speakers);
    spoken.push({
      lineNo: i + 1,
      heading,
      speaker: stripped.speaker,
      text: stripped.text.trim(),
      raw,
    });
  }
  return spoken;
}

function sentencesOf(text) {
  return text.split(/[。！？!?]/u).map(part => part.trim()).filter(Boolean);
}

function charCount(text) {
  return [...text.replace(/\s+/gu, '')].length;
}

function lineNoInRaw(raw, excerpt) {
  const lines = raw.split(/\r?\n/);
  const needle = excerpt.slice(0, Math.min(12, excerpt.length));
  const index = lines.findIndex(line => needle && line.includes(needle));
  return index === -1 ? 1 : index + 1;
}

function pushFinding(bucket, finding) {
  bucket.push(finding);
}

export async function lintText(text, {filename = 'script.md', rules} = {}) {
  const active = rules || await loadRules();
  const ext = path.extname(filename).toLowerCase();
  const errors = [];
  const warnings = [];
  const speakers = active.speakers || [];
  let spoken = [];

  if (ext === '.json') {
    const data = JSON.parse(text);
    const list = Array.isArray(data.lines) ? data.lines : [];
    spoken = list.map(line => ({
      lineNo: lineNoInRaw(text, String(line.text || '')),
      heading: String(line.beat || ''),
      speaker: String(line.speaker || ''),
      text: String(line.text || ''),
      raw: String(line.text || ''),
      beat: String(line.beat || ''),
    }));
  } else {
    spoken = extractSpokenLines(text, speakers);
  }

  const ordinal = compile(active.oral_ordinal.pattern);
  const emoji = compile(active.emoji.pattern);
  const method = active.method_in_vo;

  for (const line of spoken) {
    for (const rule of active.forbidden) {
      const hit = rule.regex ? compile(rule.pattern).test(line.text) : line.text.includes(rule.pattern);
      if (!hit) continue;
      pushFinding(rule.severity === 'warning' ? warnings : errors, {
        rule: rule.id,
        severity: rule.severity,
        line: line.lineNo,
        message: rule.message,
        excerpt: line.text,
      });
    }
    if (ordinal.test(line.text)) {
      pushFinding(errors, {
        rule: active.oral_ordinal.id,
        severity: 'error',
        line: line.lineNo,
        message: active.oral_ordinal.message,
        excerpt: line.text,
      });
    }
    if (line.text.includes(method.pattern)) {
      pushFinding(warnings, {
        rule: method.id,
        severity: 'warning',
        line: line.lineNo,
        message: method.message,
        excerpt: line.text,
      });
    }
    if (emoji.test(line.text)) {
      pushFinding(errors, {
        rule: active.emoji.id,
        severity: 'error',
        line: line.lineNo,
        message: active.emoji.message,
        excerpt: line.text,
      });
    }
    for (const sentence of sentencesOf(line.text)) {
      const count = charCount(sentence);
      if (count > active.max_sentence_chars) {
        pushFinding(warnings, {
          rule: active.long_sentence.id,
          severity: 'warning',
          line: line.lineNo,
          message: `${active.long_sentence.message}（${count} 字）`,
          excerpt: sentence,
        });
      }
    }
  }

  const beatSource = ext === '.json'
    ? spoken.map(line => `${line.beat} ${line.heading}`).join('\n')
    : stripSelfCheck(text);
  const missingBeats = (active.five_beats || []).filter(beat => !beatSource.includes(beat));
  if (missingBeats.length) {
    pushFinding(warnings, {
      rule: 'five-beat-missing',
      severity: active.five_beat_severity || 'warning',
      line: 1,
      message: `五步心流缺少：${missingBeats.join('、')}`,
      excerpt: missingBeats.join('、'),
    });
  }

  return {
    filename,
    errors,
    warnings,
    spokenCount: spoken.length,
    ok: errors.length === 0,
  };
}

export async function lintFile(file, opts = {}) {
  const text = await fs.readFile(file, 'utf8');
  return lintText(text, {...opts, filename: file});
}

export function formatLint(result) {
  const rows = [...result.errors, ...result.warnings];
  const lines = rows.map(row => `${row.severity === 'error' ? 'ERROR' : 'WARNING'} ${row.rule} L${row.line} ${row.message}`);
  lines.push(`${result.filename}: ${result.errors.length} errors, ${result.warnings.length} warnings`);
  return lines.join('\n');
}
