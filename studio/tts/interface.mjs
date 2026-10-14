/**
 * TTS adapter contract.
 *
 *   const tts = await openEpisodeTts(episodeDir);   // refuses unless checkpoint `lines` is open
 *   await tts.synthesize({ text, voice, emotion, speechRate, cacheDir, outFile });
 *
 * Adapters read secrets from the environment only. They must not log those values.
 * The default CLI never calls this module. A machine that holds keys imports it.
 */
import {createHash} from 'node:crypto';

export const PROVIDERS = ['dry-run', 'doubao'];

export function requiredEnv(provider) {
  switch (provider) {
    case 'doubao':
      return ['VOLC_TTS_APP_ID', 'VOLC_TTS_ACCESS_TOKEN'];
    default:
      return [];
  }
}

export function envPresent(names) {
  return Object.fromEntries(names.map(name => [name, Boolean(process.env[name])]));
}

export function cacheKey({provider, voice, text, emotion, speechRate}) {
  return createHash('sha256').update(JSON.stringify({provider, voice, text, emotion, speechRate: speechRate ?? ''})).digest('hex');
}

export async function loadAdapter(name = 'dry-run') {
  const provider = String(name || 'dry-run').toLowerCase();
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`Unknown TTS provider: ${name}. Implement studio/tts/adapters/${name}.mjs`);
  }
  const mod = await import(`./adapters/${provider}.mjs`);
  return mod.createAdapter();
}

// The only entry point for synthesizing an episode's lines. Voice costs money and locks in the
// words, so the `lines` checkpoint (approved brief + script lint, including the series' per-character
// speech rules) must be open first. A bookish script stops here, before any TTS call.
export async function openEpisodeTts(episodeDir, name = process.env.TTS_PROVIDER || 'dry-run') {
  const {evaluateCheckpoint, formatCheckpoint} = await import('../checkpoint.mjs');
  const gate = await evaluateCheckpoint(episodeDir, 'lines');
  if (gate.exitCode !== 0) {
    throw Object.assign(new Error(`TTS blocked: checkpoint lines is not open\n${formatCheckpoint(gate)}`), {code: 'TTS_BLOCKED'});
  }
  return loadAdapter(name);
}

export function missingSecrets(provider) {
  return requiredEnv(provider).filter(name => !process.env[name]);
}
