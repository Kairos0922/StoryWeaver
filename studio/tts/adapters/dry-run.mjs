export function createAdapter() {
  return {
    name: 'dry-run',
    async synthesize(job) {
      throw Object.assign(new Error(
        `Dry-run TTS adapter. Would synthesize ${job?.outFile || 'a line'} (${[...String(job?.text || '')].length} units). Set TTS_PROVIDER and the matching env vars on a machine that holds keys.`,
      ), {code: 'TTS_DRY_RUN'});
    },
  };
}
