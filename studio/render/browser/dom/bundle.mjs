import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));

let cached;

export async function kineticBundle() {
  if (cached) return cached;
  const result = await esbuild.build({
    absWorkingDir: here,
    entryPoints: [path.join(here, 'entry.jsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: false,
    legalComments: 'none',
    define: {'process.env.NODE_ENV': '"production"'},
  });
  cached = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
  return cached;
}
