// Detached render jobs. A full render takes many minutes; run it attached to an agent's tool call
// and a timeout kills or orphans it, and a retry starts a second copy. So heavy renders start
// detached (own session, stdin closed), write progress to <episode>/out/logs/, and record the
// job in state/render.job.json. The worker itself takes the episode render lock.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readLock, pidAlive} from './production.mjs';

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));

export async function startDetachedRender(episodeDir, argv) {
  const logs = path.join(episodeDir, 'out', 'logs');
  await fsp.mkdir(logs, {recursive: true});
  await fsp.mkdir(path.join(episodeDir, 'state'), {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = path.join(logs, `render-${stamp}.log`);
  const fd = fs.openSync(log, 'a');
  const child = spawn(process.execPath, [CLI, ...argv.filter(a => a !== '--json'), '--foreground'], {
    detached: true,
    stdio: ['ignore', fd, fd],
    cwd: process.cwd(),
    env: process.env,
  });
  child.unref();
  fs.closeSync(fd);
  const job = {pid: child.pid, log, started: new Date().toISOString(), argv};
  await fsp.writeFile(path.join(episodeDir, 'state', 'render.job.json'), JSON.stringify(job, null, 2));
  return job;
}

export async function renderStatus(episodeDir) {
  let job = null;
  try { job = JSON.parse(await fsp.readFile(path.join(episodeDir, 'state', 'render.job.json'), 'utf8')); } catch { /* none */ }
  const lock = await readLock(episodeDir);
  const running = Boolean(lock?.alive) || Boolean(job && pidAlive(job.pid));
  let tail = [];
  if (job?.log) {
    try { tail = (await fsp.readFile(job.log, 'utf8')).trimEnd().split('\n').slice(-8); } catch { /* gone */ }
  }
  return {running, lock, job, stale_lock: Boolean(lock && !lock.alive), tail};
}

export function formatRenderStatus(s) {
  const lines = [s.running ? 'RENDER_RUNNING' : 'RENDER_IDLE'];
  if (s.lock) lines.push(`lock: pid ${s.lock.pid} ${s.lock.cut || ''} since ${s.lock.started}${s.stale_lock ? ' (stale: process gone; next render replaces it)' : ''}`);
  if (s.job) lines.push(`last job: pid ${s.job.pid} started ${s.job.started}`, `log: ${s.job.log}`);
  lines.push(...s.tail.map(l => `  ${l}`));
  return lines.join('\n');
}
