import fs from 'node:fs/promises';
import path from 'node:path';
import {fileExists} from './qc/checks.mjs';
import {detectLanguage, loadPack, spokenUnitCount} from './lint/lint_script.mjs';

export function countSpoken(text, language) {
  return spokenUnitCount(text, language === 'en' ? 'words' : 'chars');
}

function lineDuration(line, timing) {
  const timed = timing?.lines?.[line.id];
  if (timed && typeof timed.start === 'number' && typeof timed.end === 'number') {
    return {seconds: timed.end - timed.start, source: 'timeline'};
  }
  if (typeof line.est_duration_s === 'number') return {seconds: line.est_duration_s, source: 'estimate'};
  return null;
}

export function evaluatePace({lines, language, pack, timing}) {
  const unit = pack.pace?.unit || (language === 'en' ? 'words' : 'chars');
  const maxLine = pack.pace?.max_per_s_line ?? (unit === 'words' ? 3.2 : 4.6);
  const maxAvg = pack.pace?.max_per_s_speech_avg ?? (unit === 'words' ? 2.8 : 4.0);
  const minPause = pack.key_number_pause?.min_pause_after_s ?? 0.9;
  const numberRe = pack.key_number_pause?.pattern ? new RegExp(pack.key_number_pause.pattern, 'u') : null;
  const findings = [];
  let speechUnits = 0;
  let speechSeconds = 0;
  let measured = 0;
  let estimated = 0;

  for (const line of lines) {
    const units = countSpoken(line.text || line.tts_text || '', language);
    const dur = lineDuration(line, timing);
    if (!dur) continue;
    if (dur.source === 'timeline') measured++;
    else estimated++;
    speechUnits += units;
    speechSeconds += dur.seconds;
    const rate = dur.seconds > 0 ? units / dur.seconds : 0;
    if (rate > maxLine) {
      findings.push({
        rule: 'pace',
        severity: 'error',
        line: line.id,
        message: `${rate.toFixed(2)} ${unit}/s exceeds ${maxLine} ${unit}/s`,
        rate,
      });
    }
    const isKey = line.key_number === true || (numberRe && numberRe.test(line.text || ''));
    const pause = Number(line.pause_after_s ?? 0);
    if (isKey && pause < minPause) {
      findings.push({
        rule: 'key-number-pause',
        severity: 'error',
        line: line.id,
        message: `Key-number line needs ≥${minPause}s pause after it (have ${pause})`,
      });
    }
  }

  const avg = speechSeconds > 0 ? speechUnits / speechSeconds : 0;
  if (speechSeconds > 0 && avg > maxAvg) {
    findings.push({
      rule: 'pace',
      severity: 'error',
      line: 'speech-avg',
      message: `Speech average ${avg.toFixed(2)} ${unit}/s exceeds ${maxAvg} ${unit}/s`,
      rate: avg,
    });
  }

  return {
    language,
    unit,
    speechUnits,
    speechSeconds,
    avg,
    measured,
    estimated,
    source: measured ? (estimated ? 'mixed' : 'timeline') : (estimated ? 'estimate' : 'none'),
    findings,
    ok: findings.filter(f => f.severity === 'error').length === 0,
  };
}

async function readTiming(episodeDir) {
  const candidates = [
    path.join(episodeDir, 'out', 'full', 'timeline.json'),
    path.join(episodeDir, 'out', 'hook', 'timeline.json'),
    path.join(episodeDir, 'preview', 'timeline.json'),
    path.join(episodeDir, 'audio', 'timeline.json'),
  ];
  for (const file of candidates) {
    if (await fileExists(file)) {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      return {file, data};
    }
  }
  return {file: '', data: null};
}

export async function paceEpisode(episodeDir) {
  const linesFile = path.join(episodeDir, 'lines.json');
  if (!(await fileExists(linesFile))) {
    return {ok: false, code: 'PACE', evidence: 'missing lines.json', source: 'none'};
  }
  const doc = JSON.parse(await fs.readFile(linesFile, 'utf8'));
  const lines = Array.isArray(doc.lines) ? doc.lines : [];
  const sample = lines.map(l => l.text).join('');
  const language = doc.language || detectLanguage(sample);
  const pack = await loadPack(language);
  const {file, data} = await readTiming(episodeDir);
  const result = evaluatePace({lines, language, pack, timing: data});
  result.timeline = file;
  result.code = result.ok ? 'PACE_OK' : 'PACE';
  result.evidence = result.ok
    ? `${result.source} avg ${result.avg.toFixed(2)} ${result.unit}/s`
    : result.findings.map(f => `${f.line}: ${f.message}`).join('; ');
  return result;
}

export function formatPace(result) {
  const lines = [
    result.ok ? 'PACE_OK' : 'PACE',
    `source=${result.source} avg=${(result.avg || 0).toFixed(2)} ${result.unit}/s`,
  ];
  for (const finding of result.findings || []) {
    lines.push(`- ${finding.line}: ${finding.message}`);
  }
  return lines.join('\n');
}
