import fs from 'node:fs/promises';
import path from 'node:path';
import {clearDone, stageFresh, writeDone} from './state.mjs';

export async function planGitSync(episodeDir, {retry = false} = {}) {
  if (retry) await clearDone(episodeDir, 'git-sync');
  const rel = path.relative(process.cwd(), episodeDir) || '.';
  const plan = {
    schema: 'storyweaver.git-sync.v1',
    episode: rel,
    note: 'Push and pull-request edits are their own step. Run them again with --retry without repeating TTS or the render.',
    commands: [
      'git status --short',
      'git push -u origin HEAD',
      'Update the pull request title and body for this branch. Do not put secrets in the description.',
    ],
    retry: `node studio/cli.mjs git-sync ${rel} --retry`,
    mark: `node studio/cli.mjs git-sync ${rel} --mark`,
  };
  const file = path.join(episodeDir, 'state', 'git-sync.plan.json');
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(plan, null, 2));
  return {file, plan};
}

export async function markGitSync(episodeDir) {
  const planned = await planGitSync(episodeDir);
  const marker = await writeDone(episodeDir, 'git-sync', {
    inputs: [planned.file],
    outputs: [planned.file],
  });
  return {file: planned.file, plan: planned.plan, marker};
}

export async function gitSyncStatus(episodeDir) {
  const planFile = path.join(episodeDir, 'state', 'git-sync.plan.json');
  const done = await stageFresh(episodeDir, 'git-sync');
  return {done, planFile};
}

export function formatGitSync(result, {done = false, retry = false} = {}) {
  const lines = [done && !retry ? 'GIT_SYNC_DONE' : 'GIT_SYNC_READY'];
  for (const command of result.plan.commands) lines.push(`- ${command}`);
  lines.push(result.plan.retry);
  return lines.join('\n');
}
