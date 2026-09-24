import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['--test'],{stdio:'inherit'});
execFileSync(process.execPath,['src/cli.js','validate','examples/hot-air-balloon.json'],{stdio:'inherit'});
console.log('QUALITY GATE: PASS');
