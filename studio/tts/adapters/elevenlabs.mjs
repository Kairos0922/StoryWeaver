import {missingSecrets} from '../interface.mjs';

export function createAdapter() {
  return {
    name: 'elevenlabs',
    async synthesize() {
      const missing = missingSecrets('elevenlabs');
      if (missing.length) {
        throw Object.assign(new Error(`ElevenLabs adapter: env not set: ${missing.join(', ')}. See docs/environment.md.`), {code: 'TTS_ENV'});
      }
      throw Object.assign(new Error(
        'ElevenLabs adapter is a contract. Use ELEVENLABS_API_KEY on the machine that synthesizes. Do not commit keys.',
      ), {code: 'TTS_CONTRACT_ONLY'});
    },
  };
}
