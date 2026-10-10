import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));

function git(args) {
  const r = spawnSync('git', args, {cwd: repo, encoding: 'utf8'});
  if (r.status !== 0) return '';
  return r.stdout.trim();
}

export async function createHandoff(episodeDir, {root = repo} = {}) {
  const rel = path.relative(root, episodeDir).split(path.sep).join('/');
  const commit = git(['rev-parse', 'HEAD']) || 'uncommitted';
  const doc = {
    schema: 'storyweaver.handoff.v1',
    commit,
    episode: rel,
    produced_by: 'cloud',
    run_on: 'key-holding machine',
    commands: [
      `node studio/cli.mjs doctor --episode ${rel} --require-render`,
      `node studio/cli.mjs resume ${rel}`,
      `node studio/cli.mjs predict-duration ${rel}`,
      `node studio/cli.mjs listen-pack ${rel}`,
      `node studio/cli.mjs render ${rel} --mode draft --cut full`,
    ],
    expected: [
      `${rel}/state/duration_prediction.json`,
      `${rel}/qc/listen_pack.md`,
      `${rel}/out/draft/full/render_report.json`,
    ],
    notes: 'Do not copy secrets into this file. The key-holding machine reads them from the environment.',
  };
  const file = path.join(episodeDir, 'handoff.json');
  await fs.writeFile(file, JSON.stringify(doc, null, 2));
  return {file, doc};
}

export function formatHandoff(result) {
  return `HANDOFF\n${result.file}\ncommit ${result.doc.commit}`;
}
