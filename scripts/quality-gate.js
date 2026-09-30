import {execFileSync} from 'node:child_process';

const run=(script,args=[])=>{
  console.log('\n> '+[process.execPath,script,...args].join(' '));
  execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
};

run('--test');
run('src/cli.js',['validate','examples/hot-air-balloon.json']);
run('scripts/validate-production.js');
console.log('\nQUALITY GATE: PASS');
