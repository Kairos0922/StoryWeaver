import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function hashFiles(files) {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(String(file));
    hash.update('\0');
    try {
      hash.update(await fs.readFile(file));
    } catch {
      hash.update('MISSING');
    }
  }
  return hash.digest('hex');
}

export function donePath(episodeDir, stage) {
  return path.join(episodeDir, 'state', `${stage}.done.json`);
}

export async function readDone(episodeDir, stage) {
  try {
    return JSON.parse(await fs.readFile(donePath(episodeDir, stage), 'utf8'));
  } catch {
    return null;
  }
}

export async function writeDone(episodeDir, stage, {inputs = [], outputs = [], extra = {}} = {}) {
  const marker = {
    schema: 'storyweaver.stage-done.v1',
    stage,
    completed_at: new Date().toISOString(),
    input_sha256: await hashFiles(inputs),
    output_sha256: await hashFiles(outputs),
    inputs: inputs.map(file => path.relative(episodeDir, file)),
    outputs: outputs.map(file => path.relative(episodeDir, file)),
    ...extra,
  };
  const file = donePath(episodeDir, stage);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(marker, null, 2));
  return marker;
}

export async function stageFresh(episodeDir, stage) {
  const marker = await readDone(episodeDir, stage);
  if (!marker) return false;
  const inputs = (marker.inputs || []).map(relPath => path.resolve(episodeDir, relPath));
  return marker.input_sha256 === await hashFiles(inputs);
}

export async function clearDone(episodeDir, stage) {
  await fs.rm(donePath(episodeDir, stage), {force: true});
}
