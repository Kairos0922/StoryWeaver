/**
 * TTS adapter contract.
 *
 *   const tts = await loadAdapter(process.env.TTS_PROVIDER || 'dry-run');
 *   await tts.synthesize({ text, voice, emotion, speechRate, cacheDir, outFile });
 *
 * Adapters read secrets from the environment only. They must not log those values.
 * The default CLI never calls this module. A machine that holds keys imports it.
 */
import {createHash} from 'node:crypto';

export const PROVIDERS = ['dry-run', 'doubao', 'azure', 'elevenlabs'];

export function requiredEnv(provider) {
  switch (provider) {
    case 'doubao':
      return ['VOLC_TTS_APP_ID', 'VOLC_TTS_ACCESS_TOKEN'];
    case 'azure':
      return ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'];
    case 'elevenlabs':
      return ['ELEVENLABS_API_KEY'];
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

export function missingSecrets(provider) {
  return requiredEnv(provider).filter(name => !process.env[name]);
}
