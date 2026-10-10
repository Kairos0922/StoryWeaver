import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {fileExists} from '../../qc/checks.mjs';

const kitPath = fileURLToPath(new URL('../kit/canvas/kit.js', import.meta.url));

let gestureSet;

async function gestures() {
  if (gestureSet) return gestureSet;
  const source = await fs.readFile(kitPath, 'utf8');
  const context = vm.createContext({Path2D: class {}});
  vm.runInContext(source, context);
  gestureSet = new Set(context.SWKit.gestures);
  return gestureSet;
}

function walkLayer(layer, where, rig, gestures, issues) {
  if (!layer || typeof layer !== 'object') return;
  if (layer.type === 'character') {
    const rigChar = rig?.characters?.[layer.id];
    if (!rigChar) issues.push(`${where}: no rig for character ${layer.id || '(missing id)'}`);
    else {
      const samples = [layer, ...(Array.isArray(layer.key) ? layer.key : [])];
      for (const sample of samples) {
        if (sample.expr && !rigChar.expressions?.[sample.expr]) {
          issues.push(`${where}: ${layer.id} has no expression ${sample.expr}`);
        }
        if (sample.gesture && !gestures.has(sample.gesture)) {
          issues.push(`${where}: unknown gesture ${sample.gesture}`);
        }
      }
    }
  }
  (layer.layers || []).forEach((child, i) => walkLayer(child, `${where}.layers[${i}]`, rig, gestures, issues));
  (layer.overlay || []).forEach((child, i) => walkLayer(child, `${where}.overlay[${i}]`, rig, gestures, issues));
  (layer.stack || []).filter(item => item && item.kind === 'canvas2d').forEach((child, i) => {
    walkLayer(child, `${where}.stack[${i}]`, rig, gestures, issues);
  });
}

export function validateSceneGraph({doc, rig, gestures, label}) {
  const issues = [];
  const shots = [];
  if (Array.isArray(doc?.scenes)) shots.push(...doc.scenes.map(scene => [scene.id || 'scene', scene]));
  if (Array.isArray(doc?.shots)) shots.push(...doc.shots.map(shot => [shot.id || 'shot', shot]));
  if (doc?.cover) shots.push(['cover', doc.cover]);
  for (const [id, shot] of shots) {
    for (const [bucket, list] of [['layers', shot.layers], ['overlay', shot.overlay]]) {
      (list || []).forEach((layer, i) => walkLayer(layer, `${label}:${id}.${bucket}[${i}]`, rig, gestures, issues));
    }
    (shot.stack || []).forEach((layer, i) => {
      if (layer?.kind === 'canvas2d') walkLayer(layer, `${label}:${id}.stack[${i}]`, rig, gestures, issues);
    });
  }
  return {ok: issues.length === 0, issues};
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function validateEpisodeScenes(episodeDir) {
  const issues = [];
  const known = await gestures();
  const scenesPath = path.join(episodeDir, 'render', 'scenes.json');
  const stillsPath = path.join(episodeDir, 'render', 'stills.json');
  let rig = null;
  if (await fileExists(stillsPath)) {
    const stills = await readJson(stillsPath);
    const rigPath = path.resolve(episodeDir, stills.rig || '../ip/sprites/rig.json');
    if (await fileExists(rigPath)) rig = await readJson(rigPath);
    else issues.push(`missing rig: ${rigPath}`);
    const stillReport = validateSceneGraph({doc: stills, rig, gestures: known, label: 'stills'});
    issues.push(...stillReport.issues);
  }
  if (await fileExists(scenesPath)) {
    const scenes = await readJson(scenesPath);
    if (!rig) {
      const rigPath = path.resolve(episodeDir, '../ip/sprites/rig.json');
      if (await fileExists(rigPath)) rig = await readJson(rigPath);
    }
    const sceneReport = validateSceneGraph({doc: scenes, rig, gestures: known, label: 'scenes'});
    issues.push(...sceneReport.issues);
  }
  if (!(await fileExists(scenesPath)) && !(await fileExists(stillsPath))) {
    return {ok: true, issues: [], skipped: true};
  }
  return {ok: issues.length === 0, issues};
}
