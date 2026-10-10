import fs from 'node:fs/promises';
import path from 'node:path';
import {parseFrontMatter} from './brief.mjs';
import {fileExists} from './qc/checks.mjs';

export const DEFAULT_STOP_RATIO = 0.7;

export function evaluateBudget({calls, stopRatio, used}) {
  const ratio = stopRatio == null || stopRatio === '' ? DEFAULT_STOP_RATIO : Number(stopRatio);
  if (calls == null || calls === '') {
    return {
      configured: false,
      stop: false,
      stopRatio: ratio,
      guidance: 'Set model_budget_calls on the creative brief. Record calls in state/model_usage.json. Stop at the current checkpoint once 70% of that budget is used.',
    };
  }
  const limit = Number(calls);
  if (!Number.isFinite(limit) || limit <= 0) {
    return {configured: false, stop: false, stopRatio: ratio, guidance: 'model_budget_calls must be a positive number.'};
  }
  if (used == null) {
    return {
      configured: true,
      limit,
      used: null,
      stop: false,
      stopRatio: ratio,
      guidance: `Model budget is ${limit} calls. No usage recorded yet. Stop at ${Math.round(ratio * 100)}% (${Math.floor(limit * ratio)} calls).`,
    };
  }
  const spent = used / limit;
  const stop = spent >= ratio;
  return {
    configured: true,
    limit,
    used,
    stop,
    stopRatio: ratio,
    ratio: spent,
    guidance: stop
      ? `MODEL_BUDGET_STOP at ${Math.round(spent * 100)}% of ${limit} calls. Stay on the current checkpoint.`
      : `Model budget ${used}/${limit} calls (${Math.round(spent * 100)}%). Stop at ${Math.round(ratio * 100)}%.`,
  };
}

export async function budgetStatus(episodeDir) {
  let calls = '';
  let stopRatio = '';
  const brief = path.join(episodeDir, 'brief.md');
  if (await fileExists(brief)) {
    const {data} = parseFrontMatter(await fs.readFile(brief, 'utf8'));
    calls = data.model_budget_calls;
    stopRatio = data.model_budget_stop_ratio;
  }
  let used = null;
  const usageFile = path.join(episodeDir, 'state', 'model_usage.json');
  if (await fileExists(usageFile)) {
    const usage = JSON.parse(await fs.readFile(usageFile, 'utf8'));
    if (usage.calls == null || usage.calls === '') used = null;
    else used = Number(usage.calls);
  }
  return evaluateBudget({calls, stopRatio, used});
}
