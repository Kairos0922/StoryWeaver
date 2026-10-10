import {missingSecrets} from '../interface.mjs';

export function createAdapter() {
  return {
    name: 'doubao',
    async synthesize() {
      const missing = missingSecrets('doubao');
      if (missing.length) {
        throw Object.assign(new Error(`Doubao adapter: env not set: ${missing.join(', ')}. See docs/environment.md.`), {code: 'TTS_ENV'});
      }
      throw Object.assign(new Error(
        'Doubao adapter is a contract, not a silent network client. Call it from a local job that you own, using VOLC_TTS_APP_ID and VOLC_TTS_ACCESS_TOKEN. Do not paste keys into a chat or a cloud agent prompt.',
      ), {code: 'TTS_CONTRACT_ONLY'});
    },
  };
}
