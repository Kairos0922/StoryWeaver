import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileExists} from './qc/checks.mjs';
import {writeDone} from './state.mjs';

export const LISTEN_MAX_S = 30;

const WEIGHT = {number: 3, 'character-name': 2, vote: 2, 'asr-assist': 1};

function score(reasons) {
  return Math.max(...reasons.map(reason => WEIGHT[reason] || 0), 0);
}

export function selectKeyLines({lines, names = [], asrInclude = []}) {
  const nameList = [...names].filter(name => String(name).trim().length >= 1).sort((a, b) => b.length - a.length);
  const include = new Set(asrInclude);
  return lines.map((line, index) => {
    const text = line.text || '';
    const reasons = [];
    if (line.key_number === true || /\d/.test(text)) reasons.push('number');
    if (nameList.some(name => text.includes(name))) reasons.push('character-name');
    if (index === lines.length - 1 || /站队|vote/i.test(text)) reasons.push('vote');
    if (include.has(line.id)) reasons.push('asr-assist');
    return reasons.length ? {...line, index, reasons} : null;
  }).filter(Boolean);
}

export function fitListen(selected, durations = {}, maxSeconds = LISTEN_MAX_S) {
  const ranked = [...selected].sort((a, b) => score(b.reasons) - score(a.reasons) || a.index - b.index);
  const kept = [];
  let used = 0;
  let measured = 0;
  for (const line of ranked) {
    const seconds = durations[line.id];
    if (typeof seconds !== 'number') {
      kept.push(line);
      continue;
    }
    if (used + seconds > maxSeconds + 0.05 && measured > 0) continue;
    kept.push(line);
    used += seconds;
    measured += 1;
  }
  kept.sort((a, b) => a.index - b.index);
  return {
    lines: kept,
    seconds: measured ? +Math.min(used, maxSeconds).toFixed(3) : null,
    dropped: selected.length - kept.length,
  };
}

function probeSeconds(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  if (r.status !== 0) return null;
  const seconds = Number(String(r.stdout).trim());
  return Number.isFinite(seconds) ? seconds : null;
}

async function characterNames(episodeDir, lines) {
  const names = new Set(lines.map(line => line.speaker).filter(Boolean));
  const scenesPath = path.join(episodeDir, 'render', 'scenes.json');
  if (await fileExists(scenesPath)) {
    const scenes = JSON.parse(await fs.readFile(scenesPath, 'utf8'));
    for (const name of Object.values(scenes.speakers || {})) names.add(name);
  }
  const castPath = path.join(episodeDir, '..', 'ip', 'characters.json');
  if (await fileExists(castPath)) {
    const cast = JSON.parse(await fs.readFile(castPath, 'utf8'));
    const people = Array.isArray(cast.characters) ? cast.characters : (Array.isArray(cast) ? cast : []);
    for (const person of people) {
      if (typeof person === 'string') names.add(person);
      else if (person?.name) {
        names.add(person.name);
        for (const alias of person.aliases || []) names.add(alias);
      }
    }
  }
  return [...names];
}

function checklistMarkdown({fit, audioNote}) {
  const rows = fit.lines.map(line => {
    const why = line.reasons.join(', ');
    return `- [ ] ${line.id} (${why}) ${line.speaker ? line.speaker + ': ' : ''}${line.text}`;
  });
  return [
    '# Listen pack',
    '',
    'Play the pack on a phone and tick each line after you hear it.',
    'ASR only chooses extra lines. An ASR score does not pass or fail this pack.',
    '',
    ...rows,
    '',
    audioNote,
    fit.seconds == null ? 'Duration: recordings not measured yet.' : `Duration: ${fit.seconds}s (cap ${LISTEN_MAX_S}s).`,
    fit.dropped ? `Held back ${fit.dropped} lower-priority line(s) to stay inside the cap.` : 'Every selected line fits the cap.',
    '',
  ].join('\n');
}

export async function buildListenPack(episodeDir) {
  const linesPath = path.join(episodeDir, 'lines.json');
  const linesDoc = JSON.parse(await fs.readFile(linesPath, 'utf8'));
  const lines = linesDoc.lines || [];
  let asrInclude = [];
  const asrPath = path.join(episodeDir, 'audio', 'asr_flags.json');
  if (await fileExists(asrPath)) {
    const flags = JSON.parse(await fs.readFile(asrPath, 'utf8'));
    asrInclude = Array.isArray(flags.include) ? flags.include : [];
  }
  const names = await characterNames(episodeDir, lines);
  const selected = selectKeyLines({lines, names, asrInclude});
  const durations = {};
  const files = [];
  for (const line of selected) {
    const file = path.join(episodeDir, line.file || `audio/line_${line.id.slice(1)}.wav`);
    if (await fileExists(file)) {
      const seconds = probeSeconds(file);
      if (seconds != null) {
        durations[line.id] = seconds;
        files.push({line, file, seconds});
      }
    }
  }
  const fit = fitListen(selected, durations, LISTEN_MAX_S);
  const checklistPath = path.join(episodeDir, 'qc', 'listen_pack.md');
  let audioFile = null;
  let audioNote = 'Audio: recordings are not on this machine, so the checklist is the pack.';
  const mixable = fit.lines.filter(line => typeof durations[line.id] === 'number');
  if (mixable.length) {
    const outDir = path.join(episodeDir, 'out', 'listen');
    await fs.mkdir(outDir, {recursive: true});
    audioFile = path.join(outDir, 'listen.m4a');
    const args = ['-y', '-v', 'error'];
    for (const line of mixable) args.push('-i', path.join(episodeDir, line.file || `audio/line_${line.id.slice(1)}.wav`));
    const inputs = mixable.map((_, i) => `[${i}:a]`).join('');
    args.push(
      '-filter_complex', `${inputs}concat=n=${mixable.length}:v=0:a=1[a]`,
      '-map', '[a]', '-t', String(LISTEN_MAX_S), '-c:a', 'aac', '-b:a', '128k', audioFile,
    );
    const mixed = spawnSync('ffmpeg', args, {encoding: 'utf8'});
    if (mixed.status !== 0) {
      audioFile = null;
      audioNote = 'Audio: ffmpeg could not join the recordings. The checklist is still the pack.';
    } else {
      audioNote = `Audio: ${path.relative(episodeDir, audioFile)} (trimmed to ${LISTEN_MAX_S}s).`;
    }
  }
  const markdown = checklistMarkdown({fit, audioNote});
  await fs.mkdir(path.dirname(checklistPath), {recursive: true});
  await fs.writeFile(checklistPath, markdown);
  await writeDone(episodeDir, 'listen-pack', {
    inputs: [linesPath, asrPath].filter(file => file),
    outputs: [checklistPath, audioFile].filter(Boolean),
    extra: {lines: fit.lines.map(line => line.id), seconds: fit.seconds},
  });
  return {checklistPath, audioFile, fit, audioNote};
}

export function formatListen(result) {
  const ids = result.fit.lines.map(line => line.id).join(', ');
  return [`LISTEN_PACK`, `lines=${ids || 'none'}`, result.audioNote, path.basename(result.checklistPath)].join('\n');
}
