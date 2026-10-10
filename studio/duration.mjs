import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseFrontMatter} from './brief.mjs';
import {countSpoken} from './pace.mjs';
import {detectLanguage} from './lint/lint_script.mjs';
import {fileExists} from './qc/checks.mjs';
import {writeDone, clearDone} from './state.mjs';

const HOOK_COUNT = 3;

function probeSeconds(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe failed for ${path.basename(file)}`);
  const seconds = Number(String(r.stdout).trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`No duration in ${path.basename(file)}`);
  return seconds;
}

export function predictDuration({lines, hookDurations, holds = {}, leadIn = 0.4, tail = 2.5, defaultGap = 0.25, limitSeconds, language}) {
  if (!hookDurations?.length) {
    throw Object.assign(new Error('Duration prediction needs the first recorded hook lines.'), {code: 'PREDICT_NEEDS_HOOK'});
  }
  const byId = new Map(hookDurations.map(row => [row.id, row.seconds]));
  let hookUnits = 0;
  let hookSeconds = 0;
  for (const row of hookDurations) {
    const line = lines.find(item => item.id === row.id);
    if (!line) throw Object.assign(new Error(`Hook recording ${row.id} is not in lines.json`), {code: 'PREDICT_NEEDS_HOOK'});
    hookUnits += countSpoken(line.tts_text || line.text || '', language);
    hookSeconds += row.seconds;
  }
  if (hookSeconds <= 0) {
    throw Object.assign(new Error('Hook recordings have no duration.'), {code: 'PREDICT_NEEDS_HOOK'});
  }
  const rate = hookUnits / hookSeconds;
  let cursor = leadIn;
  const predicted = [];
  lines.forEach((line, index) => {
    const units = countSpoken(line.tts_text || line.text || '', language);
    const recorded = byId.get(line.id);
    const seconds = recorded != null ? recorded : units / rate;
    const start = cursor;
    const end = cursor + seconds;
    predicted.push({
      id: line.id,
      seconds: +seconds.toFixed(4),
      source: recorded != null ? 'recorded' : 'predicted',
    });
    if (index < lines.length - 1) cursor = end + Number(line.pause_after_s ?? defaultGap) + Number(holds[line.id] ?? 0);
    else cursor = end;
  });
  const duration = cursor + tail;
  const over = limitSeconds != null && duration > Number(limitSeconds) + 0.05;
  return {
    language,
    unit: language === 'en' ? 'words' : 'chars',
    hook_rate: +rate.toFixed(4),
    hook_lines: hookDurations.map(row => row.id),
    duration_s: +duration.toFixed(3),
    limit_s: limitSeconds == null ? null : Number(limitSeconds),
    over,
    lines: predicted,
  };
}

export async function predictEpisode(episodeDir) {
  const linesPath = path.join(episodeDir, 'lines.json');
  if (!(await fileExists(linesPath))) {
    throw Object.assign(new Error('predict-duration needs lines.json'), {code: 'PREDICT_NEEDS_HOOK'});
  }
  const linesDoc = JSON.parse(await fs.readFile(linesPath, 'utf8'));
  const lines = linesDoc.lines || [];
  const scenesPath = path.join(episodeDir, 'render', 'scenes.json');
  const scenes = await fileExists(scenesPath) ? JSON.parse(await fs.readFile(scenesPath, 'utf8')) : {};
  const hookCount = scenes.hook_lines || HOOK_COUNT;
  const hookLines = lines.slice(0, hookCount);
  const audioDir = path.join(episodeDir, 'audio');
  const missing = [];
  const hookDurations = [];
  for (const line of hookLines) {
    const file = path.join(audioDir, path.basename(line.file || `line_${line.id.slice(1)}.wav`));
    if (!(await fileExists(file))) missing.push(line.id);
    else hookDurations.push({id: line.id, seconds: probeSeconds(file), file});
  }
  if (missing.length) {
    throw Object.assign(new Error(
      `Record the first ${hookCount} hook lines before predicting the full duration. Missing: ${missing.join(', ')}`,
    ), {code: 'PREDICT_NEEDS_HOOK'});
  }
  let limit = null;
  const briefPath = path.join(episodeDir, 'brief.md');
  if (await fileExists(briefPath)) {
    const {data} = parseFrontMatter(await fs.readFile(briefPath, 'utf8'));
    if (data.target_duration_s !== '' && data.target_duration_s != null) limit = Number(data.target_duration_s);
  }
  const language = linesDoc.language || detectLanguage(lines.map(line => line.text || '').join(''));
  const result = predictDuration({
    lines,
    hookDurations,
    holds: scenes.holds || {},
    leadIn: scenes.lead_in_s ?? 0.4,
    tail: scenes.tail_s ?? 2.5,
    defaultGap: scenes.default_gap_s ?? 0.25,
    limitSeconds: limit,
    language,
  });
  const out = path.join(episodeDir, 'state', 'duration_prediction.json');
  await fs.mkdir(path.dirname(out), {recursive: true});
  await fs.writeFile(out, JSON.stringify({schema: 'storyweaver.duration-prediction.v1', ...result}, null, 2));
  if (result.over) await clearDone(episodeDir, 'duration-predict');
  else {
    await writeDone(episodeDir, 'duration-predict', {
      inputs: [linesPath, scenesPath, ...hookDurations.map(row => row.file)].filter(Boolean),
      outputs: [out],
    });
  }
  return result;
}

export function formatPrediction(result) {
  const lines = [
    result.over ? 'PREDICT_OVER_LIMIT' : 'PREDICT_OK',
    `rate=${result.hook_rate} ${result.unit}/s duration=${result.duration_s}s limit=${result.limit_s ?? 'none'}`,
  ];
  if (result.over) lines.push('Revise the script before full TTS. Do not record the remaining lines yet.');
  return lines.join('\n');
}
