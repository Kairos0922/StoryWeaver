import {missingSecrets} from '../interface.mjs';

export function createAdapter() {
  return {
    name: 'azure',
    async synthesize() {
      const missing = missingSecrets('azure');
      if (missing.length) {
        throw Object.assign(new Error(`Azure adapter: env not set: ${missing.join(', ')}. See docs/environment.md.`), {code: 'TTS_ENV'});
      }
      throw Object.assign(new Error(
        'Azure Speech adapter is a contract. Use AZURE_SPEECH_KEY and AZURE_SPEECH_REGION on the machine that synthesizes. Do not commit keys.',
      ), {code: 'TTS_CONTRACT_ONLY'});
    },
  };
}
