import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const packsDir = fileURLToPath(new URL('./packs', import.meta.url));

export async function loadPack(language = 'en') {
  const file = path.join(packsDir, `${language}.json`);
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function loadRules(language = 'en') {
  return loadPack(language);
}

function compile(pattern) {
  return new RegExp(pattern, 'u');
}

export function detectLanguage(text, explicit) {
  if (explicit) return explicit;
  const chars = [...String(text)].filter(ch => /\S/.test(ch));
  if (!chars.length) return 'en';
  const cjk = chars.filter(ch => /\p{Script=Han}/u.test(ch)).length;
  return cjk / chars.length >= 0.2 ? 'zh' : 'en';
}

export function stripSelfCheck(markdown) {
  return markdown.replace(/^#{1,6}\s+(自查|Self-check)[\s\S]*$/im, '');
}

export function stripSpeaker(text, speakers) {
  const match = text.match(/^([^：:]{1,16})[：:]\s*(.*)$/u);
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

export function spokenUnitCount(text, unit = 'chars') {
  if (unit === 'words') {
    return String(text).trim().split(/\s+/).filter(Boolean).length;
  }
  return [...String(text).replace(/\s+/gu, '')].filter(ch => !/[，。？！、…“”‘’：；,.?!:;—\-（）()「」《》]/.test(ch)).length;
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

function beatCovered(source, beats) {
  const hay = String(source).toLowerCase();
  return beats.filter(beat => !hay.includes(String(beat).toLowerCase()));
}

export async function lintText(text, {filename = 'script.md', rules, language} = {}) {
  const lang = language || detectLanguage(text);
  const active = rules || await loadPack(lang);
  const ext = path.extname(filename).toLowerCase();
  const errors = [];
  const warnings = [];
  const speakers = active.speakers || [];
  let spoken = [];
  let data = null;

  if (ext === '.json') {
    data = JSON.parse(text);
    const list = Array.isArray(data.lines) ? data.lines : [];
    spoken = list.map(line => ({
      lineNo: lineNoInRaw(text, String(line.text || '')),
      heading: String(line.beat || ''),
      speaker: String(line.speaker || ''),
      text: String(line.text || ''),
      raw: String(line.text || ''),
      beat: String(line.beat || ''),
      keyNumber: Boolean(line.key_number),
      pauseAfter: line.pause_after_s,
      emotion: String(line.emotion || ''),
    }));
  } else {
    spoken = extractSpokenLines(text, speakers);
  }

  const ordinal = compile(active.oral_ordinal.pattern);
  const emoji = compile(active.emoji.pattern);
  const method = active.method_in_vo;
  const unit = active.count_unit || 'chars';

  for (const line of spoken) {
    for (const rule of active.forbidden) {
      const hit = rule.regex ? compile(rule.pattern).test(line.text) : line.text.toLowerCase().includes(rule.pattern.toLowerCase());
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
    if (line.text.toLowerCase().includes(String(method.pattern).toLowerCase())) {
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
      const count = spokenUnitCount(sentence, unit);
      const limit = unit === 'words' ? (active.max_sentence_words || 22) : active.max_sentence_chars;
      if (count > limit) {
        pushFinding(warnings, {
          rule: active.long_sentence.id,
          severity: 'warning',
          line: line.lineNo,
          message: `${active.long_sentence.message} (${count} ${unit})`,
          excerpt: sentence,
        });
      }
    }
    if (/语速快|speak fast|talk fast|rush/i.test(line.emotion || '')) {
      pushFinding(warnings, {
        rule: 'fast-emotion',
        severity: 'warning',
        line: line.lineNo,
        message: 'Urgency belongs in tone, not in a “speak fast” cue. Pace is capped separately.',
        excerpt: line.emotion,
      });
    }
  }

  const beatSource = ext === '.json'
    ? spoken.map(line => `${line.beat} ${line.heading}`).join('\n')
    : stripSelfCheck(text);
  const missingBeats = beatCovered(beatSource, active.five_beats || []);
  // A language pack lists aliases; require at least the five canonical English names or their aliases as a set of 5 groups.
  const groups = [
    ['Hook', '钩子'],
    ['Break the assumption', '打碎常识'],
    ['Mechanism', '内幕'],
    ['Payoff', '真相'],
    ['Audience stance', '评论站队'],
  ];
  const missingGroups = groups.filter(group => group.every(name => !beatSource.toLowerCase().includes(name.toLowerCase())));
  if (missingGroups.length) {
    pushFinding(warnings, {
      rule: 'five-beat-missing',
      severity: active.five_beat_severity || 'warning',
      line: 1,
      message: `Five-beat story is missing: ${missingGroups.map(g => g[0]).join(', ')}`,
      excerpt: missingGroups.map(g => g[0]).join(', '),
    });
  } else if (missingBeats.length && missingBeats.length === (active.five_beats || []).length) {
    pushFinding(warnings, {
      rule: 'five-beat-missing',
      severity: active.five_beat_severity || 'warning',
      line: 1,
      message: `Five-beat story is missing: ${missingBeats.join(', ')}`,
      excerpt: missingBeats.join(', '),
    });
  }

  return {
    filename,
    language: active.language || lang,
    errors,
    warnings,
    spokenCount: spoken.length,
    ok: errors.length === 0,
  };
}

export async function lintFile(file, opts = {}) {
  const text = await fs.readFile(file, 'utf8');
  let language = opts.language;
  if (!language && file.endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      language = data.language;
    } catch {
      language = undefined;
    }
  }
  return lintText(text, {...opts, filename: file, language: language || detectLanguage(text, language)});
}

export function formatLint(result) {
  const rows = [...result.errors, ...result.warnings];
  const lines = rows.map(row => `${row.severity === 'error' ? 'ERROR' : 'WARNING'} ${row.rule} L${row.line} ${row.message}`);
  lines.push(`${result.filename}: ${result.errors.length} errors, ${result.warnings.length} warnings`);
  return lines.join('\n');
}
