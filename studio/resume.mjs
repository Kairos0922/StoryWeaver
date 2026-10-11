import path from 'node:path';
import {evaluateCheckpoint} from './checkpoint.mjs';
import {budgetStatus} from './budget.mjs';
import {gitSyncStatus} from './git_sync.mjs';
import {stageFresh} from './state.mjs';

function rel(episodeDir) {
  return path.relative(process.cwd(), episodeDir) || '.';
}

async function fileStage(episodeDir, id, command) {
  const done = await stageFresh(episodeDir, id);
  return {id, done, waiting: null, command, code: done ? 'DONE' : 'PENDING'};
}

export async function resumeEpisode(episodeDir) {
  const episode = rel(episodeDir);
  const budget = await budgetStatus(episodeDir);
  const brief = await evaluateCheckpoint(episodeDir, 'brief');
  const lines = brief.code === 'BRIEF_APPROVED' ? await evaluateCheckpoint(episodeDir, 'lines') : null;
  const stages = [];

  if (brief.code === 'BRIEF_APPROVED') {
    stages.push({id: 'brief', done: true, waiting: null, code: brief.code, command: null});
  } else if (brief.code === 'BRIEF_READY_FOR_REVIEW') {
    stages.push({
      id: 'brief',
      done: false,
      waiting: 'person',
      code: brief.code,
      command: 'A person approves brief.md and records the body hash. Agents do not set status: approved.',
    });
  } else {
    stages.push({
      id: 'brief',
      done: false,
      waiting: null,
      code: brief.code,
      command: `node studio/cli.mjs checkpoint ${episode} brief`,
    });
  }

  stages.push(lines?.code === 'LINES_ALLOWED'
    ? {id: 'lines', done: true, waiting: null, code: lines.code, command: null}
    : {id: 'lines', done: false, waiting: null, code: lines?.code || 'BLOCKED', command: `node studio/cli.mjs lint-script ${episode}/script.md`});

  stages.push(await fileStage(
    episodeDir,
    'duration-predict',
    `node studio/cli.mjs predict-duration ${episode}`,
  ));
  stages.push(await fileStage(
    episodeDir,
    'listen-pack',
    `node studio/cli.mjs listen-pack ${episode}`,
  ));
  stages.push(await fileStage(
    episodeDir,
    'render-draft',
    `node studio/cli.mjs render ${episode} --mode draft --cut preview --review-only`,
  ));

  const git = await gitSyncStatus(episodeDir);
  stages.push({
    id: 'git-sync',
    done: git.done,
    waiting: null,
    code: git.done ? 'DONE' : 'PENDING',
    command: `node studio/cli.mjs git-sync ${episode}${git.done ? ' --retry' : ''}`,
    retryable: true,
  });

  const release = await evaluateCheckpoint(episodeDir, 'render');
  const releaseFresh = await stageFresh(episodeDir, 'render-release');
  stages.push({
    id: 'render-release',
    done: release.code === 'RENDER_ALLOWED' && releaseFresh,
    waiting: release.code === 'RENDER_ALLOWED' ? null : 'person',
    code: release.code,
    command: release.code === 'RENDER_ALLOWED'
      ? `node studio/cli.mjs render ${episode} --mode release --cut full`
      : 'A person signs the picture checks and qc/release.json after listening. Agents cannot fill signed_by.',
  });

  const publish = await evaluateCheckpoint(episodeDir, 'publish');
  stages.push({
    id: 'publish',
    done: publish.code === 'PUBLISH_ALLOWED',
    waiting: publish.code === 'PUBLISH_ALLOWED' ? null : 'person',
    code: publish.code,
    command: 'A person publishes and ticks the platform AI-generated-content declaration. Agents do not post.',
  });

  let next = stages.find(stage => !stage.done);
  let code = next ? (next.waiting ? 'RESUME_WAITING' : 'RESUME_NEXT') : 'RESUME_COMPLETE';
  if (budget.stop) {
    code = 'MODEL_BUDGET_STOP';
    next = null;
  }
  return {code, budget, next, stages, episode};
}

export function formatResume(result) {
  const lines = [result.code];
  lines.push(result.budget.guidance);
  if (result.next) {
    lines.push(`next: ${result.next.id}`);
    if (result.next.command) lines.push(result.next.command);
  }
  for (const stage of result.stages) {
    const flag = stage.done ? 'done' : (stage.waiting ? 'waiting' : 'open');
    lines.push(`${flag}  ${stage.id}  ${stage.code}`);
  }
  return lines.join('\n');
}
